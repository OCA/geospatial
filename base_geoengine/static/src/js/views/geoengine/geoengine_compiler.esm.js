/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {ViewCompiler} from "@web/views/view_compiler";

export class GeoengineCompiler extends ViewCompiler {}

GeoengineCompiler.OWL_DIRECTIVE_WHITELIST = [
    ...ViewCompiler.OWL_DIRECTIVE_WHITELIST,
    "t-name",
];
