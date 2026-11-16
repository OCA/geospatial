/** @odoo-module **/

/**
 * Copyright 2026 mytime.click
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
 */

import {DomainSelectorGeoFieldInput} from "@geoengine_advanced_search/js/widgets/domain_selector_geo_field/domain_selector_geo_field_input/domain_selector_geo_field_input.esm";
import {patch} from "@web/core/utils/patch";

patch(DomainSelectorGeoFieldInput.prototype, {
    /**
     * Image field of the reference model, shown next to the records of the
     * geo value editor: the first of logo, image_128 or avatar_128 the model
     * defines (see Base.get_geo_reference_models).
     * @param {Object} geoValue
     * @returns {String}
     */
    getImageField(geoValue) {
        const info = this.getReferenceModel(geoValue.resModel);
        return info?.image_field || "";
    },
});
