/** @odoo-module **/

import {Component} from "@odoo/owl";
import {registry} from "@web/core/registry";
const parsers = registry.category("parsers");

export class DomainSelectorFieldInput extends Component {
    parseValue(value) {
        const parser = parsers.get(this.props.field.type, (val) => val);
        try {
            return parser(value);
        } catch (_) {
            return value;
        }
    }

    onChange(ev) {
        this.props.update({value: this.parseValue(ev.target.value)});
    }
}
DomainSelectorFieldInput.template = "base_geoengine.DomainSelectorFieldInput";
