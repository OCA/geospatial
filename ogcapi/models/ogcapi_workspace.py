#############################################################################
#
#    Odoo OGC API
#
#    Copyright (C) 2025-TODAY Geon Information Technologies Inc. (<https://www.geonbt.com.tr>)
#    Copyright (C) 2025-TODAY Nezih Gülesanlar (<postanezih@gmail.com>)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################

import logging

from odoo import _, api, fields, models

from odoo.addons.http_routing.models.ir_http import slugify

from .ogcapi_exceptions import BadRequestException, OgcapiException

#############################################################################

_logger = logging.getLogger(__name__)


class OgcapiWorkspace(models.Model):
    """OGC API Workspace Model"""

    _name = "ogcapi.workspace"
    _description = "OGC API Workspace Model"
    _rec_name = "name"
    _inherit = ["ogcapi.core.mixin"]

    FORMAT_DEFAULT = "json"

    name = fields.Char("Workspace Name", required=True)
    slug = fields.Char(
        "Workspace Slug", compute="_compute_slug", store=True, index=True, readonly=True
    )

    title = fields.Char(required=True)
    description = fields.Text(required=True)
    contact_id = fields.Many2one(
        comodel_name="res.partner",
        string="Service Contact",
        domain="[('is_company','=',False)]",
    )
    collection_ids = fields.One2many(
        "ogcapi.collection", "workspace_id", string="Collections"
    )

    _sql_constraints = [("name_uniq", "unique(name)", "Workspace name must be unique!")]

    def action_workspace_collections(self):
        """
        Returns an action to open the collections related to
        this API in a tree or form view.

        :return: Dictionary representing the Odoo action.
        :rtype: dict
        """
        return {
            "name": _("Collections"),
            "res_model": "ogcapi.collection",
            "view_mode": "tree,form",
            "context": {"default_workspace_id": self.id},
            "domain": [("workspace_id", "=", self.id)],
            "target": "current",
            "type": "ir.actions.act_window",
        }

    @api.depends("name")
    def _compute_slug(self):
        for rec in self:
            rec.slug = slugify(rec.name) if rec.name else ""

    @api.model
    def _get_workspace_record(self, workspace_name=None):
        """Get workspace or raise exception if not found"""
        if not workspace_name:
            raise BadRequestException("Workspace name is required")

        workspace = self.search([("name", "=", workspace_name)], limit=1)
        if not workspace:
            raise BadRequestException()

        return workspace

    @api.model
    def _get_collection_record(self, workspace_name=None, collection_name=None):
        """
        Returns the collection record for the given workspace and collection names.
        :param workspace_name: Name of the workspace.
        :type workspace_name: str
        :param collection_name: Name of the collection.
        :type collection_name: str
        :return: Collection record or None if not found.
        :rtype: ogcapi.collection
        """
        if not workspace_name or not collection_name:
            raise BadRequestException("Workspace and Collection names are required")

        workspace = self._get_workspace_record(workspace_name)

        collection = self.env["ogcapi.collection"].search(
            [("workspace_id", "=", workspace.id), ("name", "=", collection_name)],
            limit=1,
        )
        if not collection:
            raise BadRequestException()

        return collection

    def _get_request_parameters(self, processed_params):
        """
        Returns the request parameters for the API.
        :param processed_params: Processed parameters from the request.
        :type processed_params: dict
        :return: Dictionary of request parameters.
        :rtype: dict
        """
        return {
            "lang": self.env.context.get("lang", "_").split("_")[0],
            "f": self.env.context.get("ogcapi_format", None),
            **processed_params,
        }

    def get_collection_items(self, workspace_name=None, collection_name=None, **kwargs):
        """
        Returns the items of a specific collection.
        """
        if not workspace_name or not collection_name:
            raise BadRequestException()
        try:

            collection = self._get_collection_record(workspace_name, collection_name)

            result = collection.get_items(**kwargs)
            return self.handle_api_response("getItems", data=result, status_code=200)

        except OgcapiException as e:
            return self.handle_exception(e)

    def get_collection_item(
        self, workspace_name=None, collection_name=None, feature_id=None, **kwargs
    ):
        """
        Returns an item of a specific collection by feature_id.
        """
        if not workspace_name or not collection_name or not feature_id:
            raise BadRequestException()
        try:

            collection = self._get_collection_record(workspace_name, collection_name)

            result = collection.get_item(feature_id, **kwargs)
            result["links"] = self.build_all_links(
                "Item",
                params={
                    "workspaceId": workspace_name,
                    "collectionId": collection.name,
                    "featureId": feature_id,
                },
                title=collection.title,
            )
            return self.handle_api_response("getItem", data=result, status_code=200)

        except OgcapiException as e:
            return self.handle_exception(e)

    def _get_landing(self):
        # Implement the logic to get the landing page
        return {
            "title": self.title or self.name,
            "description": self.description,
            "links": [],
        }

    def _get_conformance(self):
        # Implement the logic to get conformance information
        return {
            "conformsTo": [
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
            ],
            "links": [],
        }
