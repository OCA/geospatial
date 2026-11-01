/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {
    replaceActiveIds,
    useActiveIdsOperators,
} from "../domain_selector_active_ids/domain_selector_active_ids.esm";
import {Domain} from "@web/core/domain";
import {DomainSelectorDialog} from "@web/core/domain_selector_dialog/domain_selector_dialog";
import {_t} from "@web/core/l10n/translation";
import {rpc} from "@web/core/network/rpc";
import {user} from "@web/core/user";

/**
 * This class is extended from DomainSelectorDialog in order to be able to
 * use a dedicated template. Props are inherited from DomainSelectorDialog.
 */
export class DomainSelectorGeoFieldDialog extends DomainSelectorDialog {}

DomainSelectorGeoFieldDialog.template = "base_geoengine.DomainSelectorGeoFieldDialog";

/**
 * Dialog editing the domain of a vector layer: the domain can use the
 * "in active_ids" operators, which are validated on an empty list of ids.
 */
export class GeoVectorLayerDomainDialog extends DomainSelectorGeoFieldDialog {
    setup() {
        super.setup();
        useActiveIdsOperators();
    }

    async onConfirm() {
        const confirmEl = this.confirmButtonRef();
        if (confirmEl) {
            confirmEl.disabled = true;
        }
        let isValid = false;
        try {
            const evalContext = {...user.context, ...this.props.context};
            const domain = new Domain(replaceActiveIds(this.state.domain)).toList(
                evalContext
            );
            isValid = await rpc("/web/domain/validate", {
                model: this.props.resModel,
                domain,
            });
        } catch {
            isValid = false;
        }
        if (!isValid) {
            if (confirmEl) {
                confirmEl.disabled = false;
            }
            this.notification.add(_t("Domain is invalid. Please correct it"), {
                type: "danger",
            });
            return;
        }
        this.props.onConfirm(this.state.domain);
        this.props.close();
    }
}
