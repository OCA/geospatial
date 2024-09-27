/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Field} from "@web/views/fields/field";
import {Widget} from "@web/views/widgets/widget";
import {_lt} from "@web/core/l10n/translation";
import {archParseBoolean, getActiveActions} from "@web/views/utils";
import {visitXML} from "@web/core/utils/xml";

export const INFO_BOX_ATTRIBUTE = "info_box";

export class GeoengineArchParser {
    parse(xmlDoc, models, modelName) {
        const templateDocs = {};
        const fieldNodes = {};
        const activeFields = {};
        const geoengineAttr = {};
        let widgetNextId = 0;
        const widgetNodes = {};
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
                    "geoengine"
                );
                const name = fieldInfo.name;
                fieldNodes[name] = fieldInfo;
                node.setAttribute("field_id", name);
            }

            if (node.tagName === "widget") {
                const widgetInfo = Widget.parseWidgetNode(node);
                const widgetId = `widget_${++widgetNextId}`;
                widgetNodes[widgetId] = widgetInfo;
                node.setAttribute("widget_id", widgetId);
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
            activeActions,
            className,
            defaultGroupBy,
            templateDocs,
            activeFields,
            fieldNodes,
            widgetNodes,
            limit: limit && parseInt(limit, 10),
            countLimit: countLimit && parseInt(countLimit, 10),
            xmlDoc,
            ...geoengineAttr,
        };
    }
}
