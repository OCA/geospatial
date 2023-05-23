/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {addFieldDependencies} from "@web/views/utils";
import {Field} from "@web/views/fields/field";
import {Widget} from "@web/views/widgets/widget";
import {XMLParser} from "@web/core/utils/xml";
import {_lt} from "@web/core/l10n/translation";

export const INFO_BOX_ATTRIBUTE = "info_box";

export class GeoengineArchParser extends XMLParser {
    /**
     * Allow you to browse and process the xml template of the geoengine view.
     * @param {*} arch
     * @param {*} models
     * @param {*} modelName
     * @returns {Object}
     */
    parse(arch, models, modelName) {
        const xmlDoc = this.parseXML(arch);
        const templateDocs = {};
        const fieldNodes = {};
        const jsClass = xmlDoc.getAttribute("js_class");
        const activeFields = {};
        const geoengineAttr = {};

        this.visitXML(xmlDoc, (node) => {
            if (["geoengine"].includes(node.tagName)) {
                geoengineAttr.editable = Boolean(
                    Number(xmlDoc.getAttribute("editable"))
                );
            }
            // Get the info box template
            if (node.hasAttribute("t-name")) {
                templateDocs[node.getAttribute("t-name")] = node;
                return;
            }
            if (node.tagName === "field") {
                const fieldInfo = Field.parseFieldNode(
                    node,
                    models,
                    modelName,
                    "geoengine",
                    jsClass
                );
                const name = fieldInfo.name;
                fieldNodes[name] = fieldInfo;
                node.setAttribute("field_id", name);

                addFieldDependencies(
                    activeFields,
                    models[modelName],
                    fieldInfo.FieldComponent.fieldDependencies
                );
            }

            if (node.tagName === "widget") {
                const {WidgetComponent} = Widget.parseWidgetNode(node);
                addFieldDependencies(
                    activeFields,
                    models[modelName],
                    WidgetComponent.fieldDependencies
                );
            }
        });
        const infoBox = templateDocs[INFO_BOX_ATTRIBUTE];
        if (!infoBox) {
            throw new Error(_lt(`Missing ${INFO_BOX_ATTRIBUTE} template.`));
        }

        for (const [key, field] of Object.entries(fieldNodes)) {
            activeFields[key] = field;
        }

        return {
            arch,
            templateDocs,
            activeFields,
            fieldNodes,
            ...geoengineAttr,
        };
    }
}
