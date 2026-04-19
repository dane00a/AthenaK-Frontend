"""Read a 2D slice out of a .athdf / HDF5 dump, downsample, return JSON.

The upstream .athdf layout is not standardised across AthenaK versions; this
module tries a few common shapes:
  - dataset shape (nvar, nmb, nx3, nx2, nx1) with a 'VariableNames' attribute
  - dataset shape (nx3, nx2, nx1) with one dataset per variable

Falls back to "first dataset, first variable" when it can't introspect.
Everything runs in-process on the backend via h5py.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import h5py
import numpy as np


@dataclass
class HeatmapField:
    variable: str
    axis: str  # "x" | "y" | "z"
    index: int
    x: list[float]
    y: list[float]
    z: list[list[float]]
    vmin: float
    vmax: float
    shape: tuple[int, ...]


def _list_variables(f: h5py.File) -> list[str]:
    # Prefer the 'VariableNames' attribute that AthenaK packs on the root.
    names = f.attrs.get("VariableNames")
    if names is not None:
        return [n.decode("utf-8") if isinstance(n, bytes) else str(n) for n in names]
    # Fall back to top-level datasets.
    return [k for k, v in f.items() if isinstance(v, h5py.Dataset)]


def _load_array(f: h5py.File, var: str) -> np.ndarray:
    # AthenaK typical: a single 'prim' or 'cons' dataset with shape
    # (nvar, nmb, nx3, nx2, nx1) + VariableNames attr. If it's a flat dataset
    # per variable, just use that.
    names = _list_variables(f)
    for ds_name in f:
        ds = f[ds_name]
        if not isinstance(ds, h5py.Dataset):
            continue
        # Per-variable dataset?
        if ds_name == var:
            return ds[...]
        # Packed dataset with a var-index axis?
        if ds.ndim >= 4 and var in names:
            idx = names.index(var)
            arr = ds[idx]
            # If there's a meshblock axis, merge by concatenation along x1.
            # For the heatmap we want a single 3D array (nx3, nx2, nx1),
            # so we just take the first meshblock as a lightweight approximation.
            if arr.ndim == 4:
                arr = arr[0]
            return arr
    raise ValueError(f"variable {var!r} not found in file")


def _downsample(arr: np.ndarray, target: int = 512) -> np.ndarray:
    """Block-mean downsample along each axis so the returned grid has ≤target per dim."""
    factors = tuple(max(1, s // target) for s in arr.shape)
    if all(f == 1 for f in factors):
        return arr
    trimmed_shape = tuple(s - (s % f) for s, f in zip(arr.shape, factors, strict=True))
    slices = tuple(slice(0, t) for t in trimmed_shape)
    trimmed = arr[slices]
    new_shape: list[int] = []
    for s, f in zip(trimmed_shape, factors, strict=True):
        new_shape.extend([s // f, f])
    reshaped = trimmed.reshape(new_shape)
    # Mean over the inner (f) axes — axes 1, 3, 5, ...
    for ax in range(len(trimmed_shape) - 1, -1, -1):
        reshaped = reshaped.mean(axis=2 * ax + 1)
    return reshaped


def read_field(
    path: Path,
    variable: str,
    axis: str = "z",
    index: int = 0,
    max_dim: int = 512,
) -> HeatmapField:
    """Read a 2D slice of ``variable`` at ``axis=index``."""
    if axis not in {"x", "y", "z"}:
        raise ValueError(f"axis must be x/y/z, got {axis!r}")
    with h5py.File(path, "r") as f:
        arr = _load_array(f, variable)
        if arr.ndim < 2:
            raise ValueError(f"expected ≥2D array for {variable}, got shape {arr.shape}")
        if arr.ndim == 2:
            slab = arr
        elif arr.ndim == 3:
            # Index 0 = z (slowest), 1 = y, 2 = x
            ax = {"z": 0, "y": 1, "x": 2}[axis]
            index = max(0, min(index, arr.shape[ax] - 1))
            slab = np.take(arr, index, axis=ax)
        else:
            # >3D: take the first index along every extra axis, then slice.
            extra = arr.ndim - 3
            slab = arr
            for _ in range(extra):
                slab = slab[0]
            ax = {"z": 0, "y": 1, "x": 2}[axis]
            index = max(0, min(index, slab.shape[ax] - 1))
            slab = np.take(slab, index, axis=ax)

        slab = _downsample(np.asarray(slab, dtype=float), target=max_dim)
        vmin = float(np.nanmin(slab))
        vmax = float(np.nanmax(slab))
        h, w = slab.shape
    return HeatmapField(
        variable=variable,
        axis=axis,
        index=index,
        x=list(range(w)),
        y=list(range(h)),
        z=slab.tolist(),
        vmin=vmin,
        vmax=vmax,
        shape=tuple(int(s) for s in slab.shape),
    )


def list_variables(path: Path) -> list[str]:
    with h5py.File(path, "r") as f:
        return _list_variables(f)
