/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Component} from "@odoo/owl";
import {DomainSelectorGeoFieldInput} from "../domain_selector_geo_field_input/domain_selector_geo_field_input.esm";
import {_lt} from "@web/core/l10n/translation";
import {onDidChange} from "../domain_selector_operators.esm";
import {registry} from "@web/core/registry";

const dsf = registry.category("domain_selector/fields");

/**
 * This class allows you to adapt the right-hand operand and the operator of the domain
 * if the selected field is of type geo_field.
 */
export class DomainSelectorGeoField extends Component {}
Object.assign(DomainSelectorGeoField, {
    template: "base_geoengine.DomainSelectorGeoField",
    components: {
        DomainSelectorGeoFieldInput,
    },

    onDidTypeChange() {
        return {value: ""};
    },

    getOperators() {
        return [
            {
                category: "geospatial",
                label: _lt("geo_contains"),
                value: "geo_contains",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_greater"),
                value: "geo_greater",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_lesser"),
                value: "geo_lesser",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_equal"),
                value: "geo_equal",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_touch"),
                value: "geo_touch",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_within"),
                value: "geo_within",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "geospatial",
                label: _lt("geo_intersect"),
                value: "geo_intersect",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
        ];
    },
});

dsf.add("geo_multi_polygon", DomainSelectorGeoField);
dsf.add("geo_multi_point", DomainSelectorGeoField);
dsf.add("geo_multi_line", DomainSelectorGeoField);
dsf.add("geo_polygon", DomainSelectorGeoField);
dsf.add("geo_point", DomainSelectorGeoField);
dsf.add("geo_line", DomainSelectorGeoField);
