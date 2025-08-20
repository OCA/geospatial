import logging

from odoo import api, fields, models

_logger = logging.getLogger(__name__)


class OgcapiComponentResponse(models.Model):
    _name = "ogcapi.component.response"
    _description = "OGC API Response Config Object Model"
    _order = "api_id, code, is_default desc"

    name = fields.Char(required=True)
    code = fields.Selection(
        [
            ("200", "200 OK"),
            ("201", "201 Created"),
            ("204", "204 No Content"),
            ("400", "400 Bad Request"),
            ("404", "404 Not Found"),
            ("500", "500 Internal Server Error"),
        ],
        string="Status Code",
        required=True,
    )
    description = fields.Char(translate=True, help="Description of the response")

    mime_type = fields.Selection(
        string="MIME type",
        selection=[
            ("application/json", "JSON"),
            ("application/geo+json", "GeoJSON"),
            ("text/html", "HTML"),
            ("application/vnd.oai.openapi+json;version=3.0", "OpenAPI 3.0"),
        ],
        required=True,
        default="application/json",
    )
    is_default = fields.Boolean("Default Response", default=False)
    schema_id = fields.Many2one("ogcapi.component.schema")
    api_id = fields.Many2one(
        comodel_name="ogcapi.api",
        string="Operation",
    )

    _sql_constraints = [
        (
            "code_format_unique",
            "unique(code, api_id, response_format)",
            "Status code and response_format must be unique per operation!",
        ),
        (
            "name_unique",
            "unique(name, api_id)",
            "Response name must be unique per operation!",
        ),
    ]

    schema_ids = fields.Many2many(
        comodel_name="ogcapi.component.schema",
        related="schema_id.parent_ids",
        string="Parent Schemas",
        store=False,
        readonly=True,
    )

    # Computed fields

    response_format = fields.Selection(
        compute="_compute_format",
        store=True,
        selection=[
            ("json", "application/json"),
            ("geojson", "application/geo+json"),
            ("html", "text/html"),
        ],
        required=False,
    )
    oas_ref = fields.Json(
        compute="_compute_oas_ref",
        store=True,
        help="Reference to the schema used in this response",
    )

    @api.depends("mime_type")
    def _compute_format(self):
        for rec in self:
            if rec.mime_type == "application/geo+json":
                rec.response_format = "geojson"
            elif rec.mime_type == "text/html":
                rec.response_format = "html"
            else:
                rec.response_format = "json"

    @api.depends("schema_id")
    def _compute_oas_ref(self):
        for rec in self:
            rec.oas_ref = (
                {"$ref": f"#components/schemas/{rec.schema_id.code}"}
                if rec.schema_id
                else {"type": "string"}
            )

    def get_oas(self):
        """
        Get the OpenAPI response for this configuration.
        :return: OpenAPI response object.
        :rtype: dict
        """
        return {
            "description": self.description or self.name,
            "content": {
                self.mime_type: {
                    "schema": (
                        self.schema_id.oas_ref if self.schema_id else {"type": "string"}
                    )
                }
            },
        }
