// THIS FILE IS AUTO-GENERATED. Run `pnpm gen:api` against a running backend
// (or pass a path to an openapi.json). Do not edit by hand.

export interface paths {
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Shallow liveness probe — the process is up.
         */
        get: operations["health_api_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ready
         * @description Readiness probe — DB and Redis must both answer.
         */
        get: operations["ready_api_ready_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Projects */
        get: operations["list_projects_api_projects_get"];
        put?: never;
        /** Create Project */
        post: operations["create_project_api_projects_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project */
        get: operations["get_project_api_projects__project_id__get"];
        put?: never;
        post?: never;
        /** Delete Project */
        delete: operations["delete_project_api_projects__project_id__delete"];
        options?: never;
        head?: never;
        /** Update Project */
        patch: operations["update_project_api_projects__project_id__patch"];
        trace?: never;
    };
    "/api/projects/{project_id}/problem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Problem */
        get: operations["get_problem_api_projects__project_id__problem_get"];
        /** Put Problem */
        put: operations["put_problem_api_projects__project_id__problem_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/problem/from-wizard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate From Wizard */
        post: operations["generate_from_wizard_api_projects__project_id__problem_from_wizard_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/problem/from-wizard/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Preview From Wizard
         * @description Return what Generate would produce without saving. Pairs with a Monaco
         *     DiffEditor so the user sees which non-user-region lines would be replaced.
         */
        post: operations["preview_from_wizard_api_projects__project_id__problem_from_wizard_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/inputs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Inputs */
        get: operations["list_inputs_api_projects__project_id__inputs_get"];
        put?: never;
        /** Create Input */
        post: operations["create_input_api_projects__project_id__inputs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inputs/{input_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Input */
        get: operations["get_input_api_inputs__input_id__get"];
        /** Update Input */
        put: operations["update_input_api_inputs__input_id__put"];
        post?: never;
        /** Delete Input */
        delete: operations["delete_input_api_inputs__input_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/builds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Builds */
        get: operations["list_builds_api_projects__project_id__builds_get"];
        put?: never;
        /** Create Build */
        post: operations["create_build_api_projects__project_id__builds_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/builds/{build_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Build */
        get: operations["get_build_api_builds__build_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/builds/{build_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Build */
        post: operations["cancel_build_api_builds__build_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/builds/{build_id}/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Runs */
        get: operations["list_runs_api_builds__build_id__runs_get"];
        put?: never;
        /** Create Run */
        post: operations["create_run_api_builds__build_id__runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Run */
        get: operations["get_run_api_runs__run_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Run */
        post: operations["cancel_run_api_runs__run_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}/outputs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Run Outputs */
        get: operations["list_run_outputs_api_runs__run_id__outputs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}/outputs/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Run Output */
        get: operations["download_run_output_api_runs__run_id__outputs__name__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}/outputs/{name}/series": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Run Series */
        get: operations["read_run_series_api_runs__run_id__outputs__name__series_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/storage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Storage */
        get: operations["get_storage_api_projects__project_id__storage_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/retention": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Set Retention */
        put: operations["set_retention_api_projects__project_id__retention_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/runs/{run_id}/purge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Purge Run Outputs */
        delete: operations["purge_run_outputs_api_runs__run_id__purge_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Project Templates */
        get: operations["list_project_templates_api_templates_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/templates/{template_id}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Project From Template */
        post: operations["create_project_from_template_api_templates__template_id__projects_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** BuildCreate */
        BuildCreate: {
            /**
             * Cmake Flags
             * @default {}
             */
            cmake_flags: {
                [key: string]: unknown;
            };
        };
        /** BuildOut */
        BuildOut: {
            /** Id */
            id: number;
            /** Project Id */
            project_id: number;
            status: components["schemas"]["BuildStatus"];
            /** Cmake Flags */
            cmake_flags: {
                [key: string]: unknown;
            };
            /** Log Path */
            log_path: string | null;
            /** Binary Path */
            binary_path: string | null;
            /** Error */
            error: string | null;
            /**
             * Diagnostics
             * @default []
             */
            diagnostics: {
                [key: string]: unknown;
            }[];
            /** Source Hash */
            source_hash?: string | null;
            /** Reused From */
            reused_from?: number | null;
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * BuildStatus
         * @enum {string}
         */
        BuildStatus: "queued" | "running" | "success" | "failed" | "cancelled";
        /** CreateFromTemplate */
        CreateFromTemplate: {
            /** Template Id */
            template_id: string;
            /** Name */
            name?: string | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** InputFileCreate */
        InputFileCreate: {
            /** Filename */
            filename: string;
            /**
             * Content
             * @default
             */
            content: string;
        };
        /** InputFileOut */
        InputFileOut: {
            /** Id */
            id: number;
            /** Project Id */
            project_id: number;
            /** Filename */
            filename: string;
            /** Content */
            content: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** InputFileUpdate */
        InputFileUpdate: {
            /** Filename */
            filename?: string | null;
            /** Content */
            content?: string | null;
        };
        /** OutputFileOut */
        OutputFileOut: {
            /** Name */
            name: string;
            /** Size */
            size: number;
            /** Kind */
            kind: string;
        };
        /** ProblemFileOut */
        ProblemFileOut: {
            /** Id */
            id: number;
            /** Filename */
            filename: string;
            /** Content */
            content: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** ProblemFileUpdate */
        ProblemFileUpdate: {
            /** Content */
            content: string;
            /** Filename */
            filename?: string | null;
        };
        /** ProjectCreate */
        ProjectCreate: {
            /** Name */
            name: string;
            /**
             * Physics Module
             * @default hydro
             */
            physics_module: string;
            /**
             * Athenak Ref
             * @default main
             */
            athenak_ref: string;
        };
        /** ProjectOut */
        ProjectOut: {
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Slug */
            slug: string;
            /** Physics Module */
            physics_module: string;
            /** Athenak Ref */
            athenak_ref: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** ProjectUpdate */
        ProjectUpdate: {
            /** Name */
            name?: string | null;
            /** Physics Module */
            physics_module?: string | null;
            /** Athenak Ref */
            athenak_ref?: string | null;
        };
        /** RetentionIn */
        RetentionIn: {
            /** Kind */
            kind: string;
            /** N */
            n?: number | null;
        };
        /** RunCreate */
        RunCreate: {
            /** Input File Id */
            input_file_id: number;
        };
        /** RunOut */
        RunOut: {
            /** Id */
            id: number;
            /** Build Id */
            build_id: number;
            /** Input File Id */
            input_file_id: number;
            status: components["schemas"]["RunStatus"];
            /** Pid */
            pid: number | null;
            /** Log Path */
            log_path: string | null;
            /** Output Dir */
            output_dir: string | null;
            /** Exit Code */
            exit_code: number | null;
            /** Error */
            error: string | null;
            /** Started At */
            started_at: string | null;
            /** Finished At */
            finished_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * RunStatus
         * @enum {string}
         */
        RunStatus: "queued" | "running" | "success" | "failed" | "cancelled";
        /** RunUsageOut */
        RunUsageOut: {
            /** Run Id */
            run_id: number;
            /** Bytes */
            bytes: number;
        };
        /** SeriesOut */
        SeriesOut: {
            /** Columns */
            columns: string[];
            /** Rows */
            rows: number[][];
        };
        /** StorageOut */
        StorageOut: {
            /** Total Bytes */
            total_bytes: number;
            /** Build Bytes */
            build_bytes: number;
            /** Logs Bytes */
            logs_bytes: number;
            /** Run Bytes */
            run_bytes: components["schemas"]["RunUsageOut"][];
        };
        /** TemplateSummary */
        TemplateSummary: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Description */
            description: string;
            /** Physics Module */
            physics_module: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
        /** WizardParamsIn */
        WizardParamsIn: {
            /**
             * Physics Module
             * @default hydro
             */
            physics_module: string;
            /**
             * Initial Condition
             * @default uniform
             */
            initial_condition: string;
            /**
             * Emit Par For Loop
             * @default true
             */
            emit_par_for_loop: boolean;
            /**
             * Call Prim To Cons
             * @default true
             */
            call_prim_to_cons: boolean;
            /**
             * Register User Bcs
             * @default false
             */
            register_user_bcs: boolean;
            /**
             * Register User Srcs
             * @default false
             */
            register_user_srcs: boolean;
            /**
             * Register User Refinement
             * @default false
             */
            register_user_refinement: boolean;
            /**
             * Register User History
             * @default false
             */
            register_user_history: boolean;
            /**
             * Parameters
             * @default {}
             */
            parameters: {
                [key: string]: unknown;
            };
        };
        /** WizardPreview */
        WizardPreview: {
            /** Content */
            content: string;
            /** Base Content */
            base_content: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_api_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    ready_api_ready_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    list_projects_api_projects_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectOut"][];
                };
            };
        };
    };
    create_project_api_projects_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_project_api_projects__project_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_project_api_projects__project_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_project_api_projects__project_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_problem_api_projects__project_id__problem_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    put_problem_api_projects__project_id__problem_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProblemFileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    generate_from_wizard_api_projects__project_id__problem_from_wizard_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WizardParamsIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_from_wizard_api_projects__project_id__problem_from_wizard_preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WizardParamsIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WizardPreview"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_inputs_api_projects__project_id__inputs_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InputFileOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_input_api_projects__project_id__inputs_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InputFileCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InputFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_input_api_inputs__input_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                input_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InputFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_input_api_inputs__input_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                input_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InputFileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InputFileOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_input_api_inputs__input_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                input_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_builds_api_projects__project_id__builds_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BuildOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_build_api_projects__project_id__builds_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BuildCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BuildOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_build_api_builds__build_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                build_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BuildOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_build_api_builds__build_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                build_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BuildOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_runs_api_builds__build_id__runs_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                build_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_run_api_builds__build_id__runs_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                build_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RunCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_run_api_runs__run_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_run_api_runs__run_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_run_outputs_api_runs__run_id__outputs_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OutputFileOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    download_run_output_api_runs__run_id__outputs__name__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    read_run_series_api_runs__run_id__outputs__name__series_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeriesOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_storage_api_projects__project_id__storage_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StorageOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    set_retention_api_projects__project_id__retention_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RetentionIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    purge_run_outputs_api_runs__run_id__purge_delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                run_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_project_templates_api_templates_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TemplateSummary"][];
                };
            };
        };
    };
    create_project_from_template_api_templates__template_id__projects_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFromTemplate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
