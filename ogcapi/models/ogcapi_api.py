import logging
from collections import OrderedDict

from odoo import _, fields, models

from .ogcapi_core_mixin import safe_api

_logger = logging.getLogger(__name__)


class OgcapiApi(models.Model):
    """OGC API configuration repository"""

    _name = "ogcapi.api"
    _description = "OGC API Configuration"
    _inherit = ["ogcapi.core.mixin"]

    name = fields.Char(required=True, index=True)
    code = fields.Selection(
        selection=[
            ("get_landing", "Get Landing"),
            ("get_conformance", "Get Conformance"),
            ("get_openapi", "Get OpenAPI"),
            ("get_collections", "Get Collections"),
            ("get_collection", "Get Collection"),
            ("get_schema", "Get Schema"),
            ("get_items", "Get Items"),
            ("get_item", "Get Item"),
        ],
        string="Configuration Code",
        required=True,
        help="Unique code per configuration",
    )

    description = fields.Text(
        translate=True, help="Detailed description of the configuration"
    )

    http_method = fields.Selection(
        selection=[
            ("get", "GET"),
            ("post", "POST"),
            ("put", "PUT"),
            ("delete", "DELETE"),
            ("patch", "PATCH"),
            ("head", "HEAD"),
            ("options", "OPTIONS"),
        ],
        required=True,
        string="HTTP Method",
        help="HTTP method for this API configuration",
        default="get",
    )
    active = fields.Boolean(default=True)

    # Relationships
    path_id = fields.Many2one(
        "ogcapi.api.path",
        ondelete="restrict",
        string="Path",
        required=True,
        help="Path configuration for this API",
    )
    parameter_ids = fields.Many2many(
        comodel_name="ogcapi.component.parameter",
        string="Query Parameters",
        domain="[('parameter_in', '=', 'query')]",
    )
    response_ids = fields.One2many("ogcapi.component.response", "api_id")

    # SQL Constraints
    _sql_constraints = [
        ("code_uniq", "unique(code)", "Configuration code must be unique!")
    ]

    # Other methods

    def _require_params(self, pargs, *required):
        missing = [p for p in required if not pargs.get(p)]
        if missing:
            self.raise_bad_request(
                _("Missing required parameter(s): {params}").format(
                    params=", ".join(missing)
                )
            )

    def _get_module_version(self, module_name="ogcapi"):
        manifest = self.env["ir.module.module"].search(
            [("name", "=", module_name)], limit=1
        )
        return manifest.latest_version if manifest else "1.0.0"

    def _get_workspace_by_slug(self, workspace_slug):
        """Get the workspace record by slug."""
        workspace = self.env["ogcapi.workspace"].search(
            [("slug", "=", workspace_slug)], limit=1
        )
        if not workspace.exists():
            self.raise_bad_request(
                _("Workspace not found: {workspace_slug}").format(
                    workspace_slug=workspace_slug
                )
            )
        return workspace

    def _get_collection_by_slug(self, workspace_slug, collection_slug):
        """Get the collection record by slug."""
        workspace = self._get_workspace_by_slug(workspace_slug)
        collection = self.env["ogcapi.collection"].search(
            [("slug", "=", collection_slug), ("workspace_id", "=", workspace.id)],
            limit=1,
        )
        if not collection.exists():
            self.raise_bad_request(
                self.env._(
                    "Collection not found: {collection_slug} "
                    "in workspace {workspace_slug}"
                ).format(collection_slug=collection_slug, workspace_slug=workspace_slug)
            )
        return collection

    def _get_path_parameters(self, parameters=None):
        if parameters is None:
            parameters = []
        if self.parameter_id and self.parameter_id.model_id:
            parameters.append(
                (
                    self.parameter_id.model_name,
                    self.parameter_id.model_domain,
                    self.parameter_id.code,
                )
            )
        if self.parent_id:
            return self.parent_id._get_path_parameters(parameters)
        return list(reversed(parameters))

    def get_available_formats(self):
        """
        returns a list of available formats for the API.
        """
        responses = self.env["ogcapi.component.response"].search(
            [("api_id", "=", self.id), ("code", "in", ["200", "201", "204"])]
        )
        if not responses:
            return []
        formats = OrderedDict()
        for response in responses:
            formats[response.response_format] = response.mime_type
        return formats

    def validate_query_parameters(self, qargs=None):
        query_args = qargs or {}
        larg = query_args.pop("lang", "en")
        farg = self._validate_format_parameter(query_args.pop("f", None))
        query_params = self.parameter_ids.filtered(
            lambda p: p.parameter_in == "query" and p.code not in ["lang", "f"]
        )
        if not query_params.exists():
            return {**query_args, "lang": larg, "f": farg}
        validated_data = query_params.validate_parameters(**query_args)
        return {**validated_data, "lang": larg, "f": farg}

    def _validate_format_parameter(self, format_param=None):
        response_formats = self.get_available_formats()
        if not format_param:
            format_param = next(iter(response_formats), "json")
        else:
            format_param = format_param.lower()
            if format_param not in response_formats:
                self.raise_bad_request(
                    _("Invalid format parameter: {f_param}").format(
                        f_param=format_param
                    )
                )
        return format_param

    def get_oas(self):
        """
        Get the OpenAPI specification for this API configuration.
        :return: OpenAPI object.
        :rtype: dict
        """
        params_ref = [
            *[param.oas_ref for param in self.path_id.parameter_ids],
            *[param.oas_ref for param in self.parameter_ids],
        ]
        responses = {}
        schema_ids = set()
        for response in self.response_ids:
            if response.code not in responses:
                responses[response.code] = response.get_oas()
            else:
                responses[response.code]["content"].update(
                    response.get_oas()["content"]
                )
            schema_ids.add(response.schema_id.id)
            if response.schema_id and response.schema_id.parent_ids:
                schema_ids.update(response.schema_id.parent_ids.ids)
        return {
            "path": self.path_id.complete_name,
            "httpMethod": self.http_method,
            "summary": self.description or self.name,
            "operationId": self.code,
            "parameters": params_ref,
            "responses": responses,
            "schema_ids": list(schema_ids),
        }

    @safe_api
    def get_landing(self, pargs=None, qargs=None):
        """
        Get the landing page URL for the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId")

        workspace = self._get_workspace_by_slug(pargs.get("workspaceId"))
        result = workspace._get_landing()

        links = workspace.get_links(
            path_args=pargs,
            query_args=qargs,
            op_rel=[
                ["get_landing", "self"],
                ["get_conformance", "conformance"],
                ["get_collections", "data"],
                ["get_openapi", "service-desc"],
            ],
        )
        result["links"] = links

        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_conformance(self, pargs=None, qargs=None):
        """
        Get the conformance information for the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId")

        workspace = self._get_workspace_by_slug(pargs.get("workspaceId"))
        result = workspace._get_conformance()

        links = workspace.get_links(
            title=workspace.title or workspace.name,
            path_args=pargs,
            query_args=qargs,
            op_rel=[
                ["get_conformance", "self"],
            ],
        )
        result["links"] = links

        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_openapi(self, pargs=None, qargs=None):
        """
        Get the OpenAPI specification for the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        paths = self.env["ogcapi.api.path"].search(
            [("active", "=", True), ("parent_id", "!=", False)]
        )
        paths_obj = {}
        parameter_ids = set()
        schema_ids = set()
        for path in paths:
            parameter_ids.update(path.parameter_ids.ids)
            for operation in path.api_ids:
                operation_obj = operation.get_oas()
                path_name = operation_obj.pop("path", None)
                http_method = operation_obj.pop("httpMethod", None)
                parameter_ids.update(operation.parameter_ids.ids)
                schema_ids.update(operation_obj.pop("schema_ids", []))
                if not path_name or not http_method:
                    continue
                paths_obj[path_name] = {http_method: operation_obj}

        parameters = self.env["ogcapi.component.parameter"].search(
            [("id", "in", [*parameter_ids])]
        )
        schemas = self.env["ogcapi.component.schema"].browse(schema_ids)
        result = {
            "openapi": "3.0.2",
            "info": {
                "title": "OGC API",
                "version": self._get_module_version(),
                "description": _("OpenAPI definitions for OGC API"),
            },
            "servers": [
                {
                    "url": (
                        self.env["ir.config_parameter"].sudo().get_param("web.base.url")
                    ),
                    "description": _("OGC API"),
                }
            ],
            "paths": paths_obj,
            "components": {
                "parameters": parameters.get_oas() if parameters else {},
                "schemas": schemas.get_oas() if schemas else {},
            },
            "tags": [],
        }
        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_collections(self, pargs=None, qargs=None):
        """
        Get the collections for the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId")

        workspace = self._get_workspace_by_slug(pargs.get("workspaceId"))
        collections = []
        for collection in workspace.collection_ids:
            coll_dict = collection.get_collection()
            coll_dict["links"] = collection.get_links(
                path_args={**pargs, "collectionId": collection.slug},
                query_args=qargs,
                op_rel=[
                    ["get_collection", "self"],
                    ["get_items", "items"],
                ],
            )
            collections.append(coll_dict)

        links = workspace.get_links(
            path_args=pargs,
            query_args=qargs,
            op_rel=[
                ["get_collections", "self"],
            ],
        )
        result = {
            "collections": collections,
            "links": links,
        }
        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_collection(self, pargs=None, qargs=None):
        """
        Get a specific collection for the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId", "collectionId")

        collection = self._get_collection_by_slug(
            pargs.get("workspaceId"), pargs.get("collectionId")
        )
        result = collection.get_collection()
        links = collection.get_links(
            path_args=pargs,
            query_args=qargs,
            op_rel=[
                ["get_collection", "self"],
                ["get_items", "items"],
            ],
        )
        result["links"] = links
        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_schema(self, pargs=None, qargs=None):
        """
        Get the schema for a specific collection in the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId", "collectionId")

        collection = self._get_collection_by_slug(
            pargs.get("workspaceId"), pargs.get("collectionId")
        )
        if collection:
            result = collection.get_feature_schema()
        else:
            result = {}

        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_items(self, pargs=None, qargs=None):
        """
        Get items for a specific collection in the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId", "collectionId")

        collection = self._get_collection_by_slug(
            pargs.get("workspaceId"), pargs.get("collectionId")
        )

        result = collection.get_items(pargs, qargs)
        links = collection.get_links(
            path_args=pargs,
            query_args=qargs,
            op_rel=[
                ["get_items", "self"],
            ],
        )

        result["links"] = links
        return self.api_response(
            result,
            code="OK",
            status=200,
        )

    @safe_api
    def get_item(self, pargs=None, qargs=None):
        """
        Get a specific item for a collection in the OGC API.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        self._require_params(pargs, "workspaceId", "collectionId", "featureId")
        workspace_id = pargs.get("workspaceId")
        collection_id = pargs.get("collectionId")
        collection = self._get_collection_by_slug(workspace_id, collection_id)
        result = collection.get_item(pargs, qargs)

        return self.api_response(
            result,
            code="OK",
            status=200,
        )
