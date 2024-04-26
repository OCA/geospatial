/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Component} from "@odoo/owl";
import {DomainSelectorFieldInput} from "../domain_selector_field_input/domain_selector_field_input.esm";
import {DomainSelectorFieldInputForActiveIds} from "../domain_selector_field_input_for_active_ids/domain_selector_field_input_for_active_ids.esm";
import {DomainSelectorFieldInputWithTags} from "../domain_selector_field_input_with_tags/domain_selector_field_input_with_tags.esm";
import {_lt} from "@web/core/l10n/translation";
import {onDidChange} from "../domain_selector_operators.esm";
import {registry} from "@web/core/registry";

const dso = registry.category("domain_selector/operator");

/**
 * This method is extended from DomainSelectorNumberField to add some operators
 * ("in active_ids", "not in active_ids", "in", "not in").
 */
export class DomainSelectorNumberFieldExtend extends Component {}
Object.assign(DomainSelectorNumberFieldExtend, {
    template: "base_geoengine.DomainSelectorNumberFieldExtend",
    components: {
        DomainSelectorFieldInput,
        DomainSelectorFieldInputWithTags,
        DomainSelectorFieldInputForActiveIds,
    },

    onDidTypeChange() {
        return {value: 0};
    },
    getOperators() {
        const addOperators = [
            {
                category: "active_ids",
                label: _lt("in active_ids"),
                value: "in active_ids",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
            {
                category: "active_ids",
                label: _lt("not in active_ids"),
                value: "not in active_ids",
                onDidChange: onDidChange((fieldChange) => fieldChange()),
                matches({operator}) {
                    return operator === this.value;
                },
            },
        ];
        const operators = [
            "=",
            "!=",
            ">",
            "<",
            ">=",
            "<=",
            "ilike",
            "not ilike",
            "in",
            "not in",
            "set",
            "not set",
        ].map((key) => dso.get(key));
        return operators.concat(addOperators);
    },
});
registry
    .category("domain_selector/fields")
    .add("integer", DomainSelectorNumberFieldExtend, {force: true});
