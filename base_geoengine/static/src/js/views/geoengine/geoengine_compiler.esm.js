/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 * Copyright 2024 Cormaza
 */

import {ViewCompiler} from "@web/views/view_compiler";

export class GeoengineCompiler extends ViewCompiler {}

// Update to use static property instead of direct assignment
GeoengineCompiler.OWL_DIRECTIVE_WHITELIST = [
    ...ViewCompiler.OWL_DIRECTIVE_WHITELIST,
    "t-name",
];
