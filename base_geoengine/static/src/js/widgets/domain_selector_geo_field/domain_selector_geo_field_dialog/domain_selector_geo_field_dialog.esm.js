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
        return _t("Subdomain");
    }
}

DomainSelectorGeoFieldDialog.template = "base_geoengine.DomainSelectorGeoFieldDialog";
DomainSelectorDialog.props = {
    close: Function,
    className: {type: String, optional: true},
    resModel: String,
    readonly: {type: Boolean, optional: true},
    isDebugMode: {type: Boolean, optional: true},
    defaultLeafValue: {type: Array, optional: true},
    initialValue: {type: String, optional: true},
    onSelected: {type: Function, optional: true},
    update: Function,
    fieldName: String,
};
