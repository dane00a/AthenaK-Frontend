// Wizard field catalog. Keep in sync with
// backend/app/services/templates.py::WizardParams and
// backend/templates/user_problem.cpp.j2.

export const PHYSICS_MODULES = [
  "hydro",
  "mhd",
  "srhydro",
  "srmhd",
  "grhydro",
  "grmhd",
  "radiation",
] as const;
export type PhysicsModule = (typeof PHYSICS_MODULES)[number];

export const INITIAL_CONDITIONS = [
  "uniform",
  "shock_tube",
  "blast",
  "gaussian",
  "custom",
] as const;
export type InitialCondition = (typeof INITIAL_CONDITIONS)[number];

export type WizardState = {
  physics_module: PhysicsModule;
  initial_condition: InitialCondition;
  emit_par_for_loop: boolean;
  call_prim_to_cons: boolean;
  register_user_bcs: boolean;
  register_user_srcs: boolean;
  register_user_refinement: boolean;
  register_user_history: boolean;
  parameters: Record<string, number | string>;
};

export const DEFAULT_WIZARD: WizardState = {
  physics_module: "hydro",
  initial_condition: "uniform",
  emit_par_for_loop: true,
  call_prim_to_cons: true,
  register_user_bcs: false,
  register_user_srcs: false,
  register_user_refinement: false,
  register_user_history: false,
  parameters: {},
};
