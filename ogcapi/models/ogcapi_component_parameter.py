import logging
import re

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class OgcapiComponentParameter(models.Model):
    """OGC API Parameter Config Object Model"""

    _name = "ogcapi.component.parameter"
    _description = "OGC API Parameter Config Object Model"
    _order = "sequence, code"
    _inherit = ["ogcapi.core.mixin"]

    name = fields.Char(required=True, index=True)
    code = fields.Char(
        "Configuration Code", required=True, help="Unique code for the configuration"
    )
    description = fields.Text(
        translate=True, help="Detailed description of the parameter"
    )
    parameter_in = fields.Selection(
        [
            ("query", "Query"),
            ("path", "Path"),
            ("header", "Header"),
            ("cookie", "Cookie"),
        ],
        string="In",
        required=True,
        default="query",
    )
    required = fields.Boolean(default=False)
    sequence = fields.Integer(default=10)
    parameter_type = fields.Selection(
        [
            ("string", "String"),
            ("integer", "Integer"),
            ("number", "Number"),
            ("boolean", "Boolean"),
            ("array", "Array"),
        ],
        required=True,
        default="string",
    )
    enum = fields.Char("Enum Values (comma separated)")
    minimum = fields.Float(default=None)
    maximum = fields.Float(default=None)
    default = fields.Char("Default Value")

    # Items for array type
    items_type = fields.Selection(
        [
            ("string", "String"),
            ("integer", "Integer"),
            ("number", "Number"),
            ("boolean", "Boolean"),
        ]
    )
    items_min = fields.Integer("Items Minimum")
    items_max = fields.Integer("Items Maximum")

    # Computed fields
    oas_ref = fields.Json(
        compute="_compute_oas_ref",
        store=True,
        help="Reference to the schema used in this parameter",
    )

    _sql_constraints = [
        ("code_unique", "unique(code)", "Code must be unique per configuration type."),
        ("name_unique", "unique(name)", "Name must be unique per configuration type."),
    ]
    # Constraints

    @api.constrains("code")
    def _check_code_format(self):
        for rec in self:
            if rec.code:
                if not re.match(r"^[A-Za-z0-9_-]+$", rec.code):
                    raise UserError(
                        self.env._(
                            "Code must only contain letters, numbers, underscores "
                            "or dashes (no spaces or special characters)."
                        )
                    )

    @api.depends("code")
    def _compute_oas_ref(self):
        for rec in self:
            rec.oas_ref = {"$ref": f"#/components/parameters/{rec.code}"}

    @api.model
    def coerce_types(self, parameter_type, value):
        try:
            if parameter_type == "integer":
                return int(value)
            elif parameter_type == "number":
                return float(value)
            elif parameter_type == "boolean":
                if isinstance(value, str):
                    return value.lower() in ("true", "1", "yes")
                return bool(value)
            return value
        except Exception:
            return value

    def get_schema(self):
        """Produce a JSON Schema-like dict for this parameter."""
        schema = {"type": self.parameter_type or "string"}
        if self.enum:
            schema["enum"] = [v.strip() for v in self.enum.split(",") if v.strip()]
        if self.minimum is not None:
            schema["minimum"] = self.minimum
        if self.maximum is not None:
            schema["maximum"] = self.maximum
        if self.default:
            schema["default"] = self.coerce_types(self.parameter_type, self.default)
        return schema

    def get_schemas(self):
        """Produce a JSON Schema-like dict for all parameters in this configuration."""
        schema = {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": True,
        }
        for rec in self:
            schema["properties"][rec.code] = rec.get_schema()
            if rec.required:
                schema["required"].append(rec.code)
        return schema

    def validate_parameters(self, **kwargs):
        schema = self.get_schemas()
        success, error, validated_data = self.env[
            "ogcapi.component.schema"
        ].validate_schema(data=kwargs, schema=schema, use_defaults=True)
        if not success:
            self.raise_bad_request(
                _("Invalid query parameters: {query_params_error}").format(
                    query_params_error=", ".join(error)
                )
            )
        return validated_data

    def get_oas(self):
        """
        Get the OpenAPI parameter for this configuration.
        :return: OpenAPI parameter object.
        :rtype: dict
        """
        params = {}
        for rec in self:
            param = {
                "name": rec.code,
                "in": rec.parameter_in,
                "required": rec.required,
                "schema": {
                    "type": rec.parameter_type or "string",
                },
            }
            if rec.enum:
                param["schema"]["enum"] = [
                    v.strip() for v in rec.enum.split(",") if v.strip()
                ]
            if rec.default:
                param["schema"]["default"] = self.coerce_types(
                    rec.parameter_type, rec.default
                )
            if rec.description:
                param["description"] = rec.description
            params[rec.code] = param
        return params
