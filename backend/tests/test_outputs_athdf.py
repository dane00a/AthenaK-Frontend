from pathlib import Path

import h5py
import numpy as np

from app.services import outputs_athdf


def _make_simple_file(path: Path, shape=(4, 8, 16)) -> None:
    with h5py.File(path, "w") as f:
        # nz, ny, nx — classic 3D field array.
        data = np.arange(np.prod(shape)).reshape(shape).astype("float32")
        f.create_dataset("rho", data=data)
        f.create_dataset("prs", data=data * 2)


def test_list_variables(tmp_path: Path) -> None:
    p = tmp_path / "demo.athdf"
    _make_simple_file(p)
    assert set(outputs_athdf.list_variables(p)) == {"rho", "prs"}


def test_read_field_z_slice_shape(tmp_path: Path) -> None:
    p = tmp_path / "demo.athdf"
    _make_simple_file(p, shape=(4, 8, 16))
    field = outputs_athdf.read_field(p, variable="rho", axis="z", index=2)
    # Default downsample target is 512, so 8x16 survives unchanged.
    assert field.shape == (8, 16)
    assert len(field.z) == 8 and len(field.z[0]) == 16
    assert field.vmax >= field.vmin


def test_read_field_downsamples(tmp_path: Path) -> None:
    p = tmp_path / "big.athdf"
    _make_simple_file(p, shape=(2, 1024, 1024))
    field = outputs_athdf.read_field(p, variable="rho", axis="z", index=0, max_dim=512)
    assert max(field.shape) <= 512


def test_read_field_unknown_variable_raises(tmp_path: Path) -> None:
    p = tmp_path / "demo.athdf"
    _make_simple_file(p)
    try:
        outputs_athdf.read_field(p, variable="no_such_var")
    except ValueError:
        return
    raise AssertionError("expected ValueError for unknown variable")
