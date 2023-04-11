/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {DomainSelectorDialog} from "@web/core/domain_selector_dialog/domain_selector_dialog";
import {_t} from "@web/core/l10n/translation";

/**
 * This class is extended from DomainSelectorGeoField in order to be able to
 * modify the title of the dialog window and to add some props to it.
 */
export class DomainSelectorGeoFieldDialog extends DomainSelectorDialog {
    get dialogTitle() {
        return _t(this.props.title);
    }
}

DomainSelectorGeoFieldDialog.template = "base_geoengine.DomainSelectorGeoFieldDialog";
DomainSelectorGeoFieldDialog.props = {
    close: Function,
    className: {type: String, optional: true},
    resModel: String,
    readonly: {type: Boolean, optional: true},
    isDebugMode: {type: Boolean, optional: true},
    defaultLeafValue: {type: Array, optional: true},
    initialValue: {type: String, optional: true},
    onSelected: Function,
    fieldName: {type: String, optional: true},
    title: {type: String, optional: true},
    model: {type: Object, optional: true},
};

DomainSelectorGeoFieldDialog.defaultProps = {
    initialValue: "",
    readonly: true,
    isDebugMode: false,
    title: "Domain",
};
