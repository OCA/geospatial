/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

const {Component, onRendered} = owl;
/**
 * This class is extended from DomainSelectorFieldInput.
 * It allows you to set a default value for the field and a readonly property for the active_ids value.
 */
export class DomainSelectorFieldInputForActiveIds extends Component {
    setup() {
        onRendered(() => {
            this.props.update({value: this.props.value});
        });
    }
}
DomainSelectorFieldInputForActiveIds.template =
    "base_geoengine.DomainSelectorFieldInputForActiveIds";
