/** @odoo-module */
import {Field} from "@web/views/fields/field";
import {visitXML} from "@web/core/utils/xml";
import {_lt} from "@web/core/l10n/translation";
import {archParseBoolean, getActiveActions} from "@web/views/utils";

export const INFO_BOX_ATTRIBUTE = "info_box";

export class MapArchParser {
    parse(xmlDoc, models, modelName) {
        const templateDocs = {};
        const fieldNodes = {};
        const allFields = {};
        const mapAttr = {};
        const limit = xmlDoc.getAttribute("limit");
        const countLimit = xmlDoc.getAttribute("count_limit");

        const activeActions = getActiveActions(xmlDoc);
        activeActions.archiveGroup = archParseBoolean(
            xmlDoc.getAttribute("archivable"),
            true
        );
        activeActions.createGroup = archParseBoolean(
            xmlDoc.getAttribute("group_create"),
            true
        );
        activeActions.deleteGroup = archParseBoolean(
            xmlDoc.getAttribute("group_delete"),
            true
        );
        activeActions.editGroup = archParseBoolean(
            xmlDoc.getAttribute("group_edit"),
            true
        );
        activeActions.quickCreate =
            activeActions.create &&
            archParseBoolean(xmlDoc.getAttribute("quick_create"), true);
        const className = xmlDoc.getAttribute("class") || null;
        const defaultGroupBy = xmlDoc.getAttribute("default_group_by");

        visitXML(xmlDoc, (node) => {
            if (["leaflet_map"].includes(node.tagName)) {
                mapAttr.editable = Boolean(Number(xmlDoc.getAttribute("editable")));
                for (let i in node.getAttributeNames()) {
                    let attribute = node.getAttributeNames();
                    allFields[attribute[i]] = node.getAttribute(attribute[i]);
                }
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
                    "web_view_leaflet_map"
                );
                for (let i of xmlDoc.attributes) {
                    if (i.value === fieldInfo.name) {
                        const name = i.name;
                        fieldNodes[name] = fieldInfo;
                        node.setAttribute("field_id", name);
                    }
                }
            }
        });

        return {
            activeActions,
            className,
            defaultGroupBy,
            templateDocs,
            fieldNodes,
            allFields,
            limit: limit && parseInt(limit, 10),
            countLimit: countLimit && parseInt(countLimit, 10),
            xmlDoc,
            ...mapAttr,
        };
    }
}
