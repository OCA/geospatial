/** @odoo-module */

import {XMLParser} from "@web/core/utils/xml";

export class GeoengineArchParser extends XMLParser {
    parse(arch) {
        const xmlDoc = this.parseXML(arch);
        const the_geom_field = xmlDoc.getAttribute("the_geom");
        //const limit = xmlDoc.getAttribute("limit") || 80;
        return {
            the_geom_field,
        };
    }
}
