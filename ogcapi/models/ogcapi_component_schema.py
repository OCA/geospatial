import json
import logging

import jsonschema
from jsonschema import validators

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class OgcapiComponentSchema(models.Model):
    _name = "ogcapi.component.schema"
    _description = "OGC API JSON Schema"

    name = fields.Char(required=True, index=True)
    code = fields.Char(required=True, index=True, help="Unique code for the schema")
    description = fields.Text(help="Detailed description of the schema")
    schema_text = fields.Text("Schema (JSON)", required=True)
    schema_json = fields.Json(
        "Schema (Parsed)", compute="_compute_schema_json", store=True
    )
    parent_ids = fields.Many2many(
        "ogcapi.component.schema",
        "ogcapi_component_schema_rel",
        "child_id",
        "parent_id",
        string="Parent Schemas",
    )
    schema_type = fields.Selection(
        [
            ("object", "Object"),
            ("array", "Array"),
            ("string", "String"),
            ("integer", "Integer"),
            ("number", "Number"),
            ("boolean", "Boolean"),
        ],
        default="object",
    )

    oas_ref = fields.Json(
        compute="_compute_oas_ref", store=True, help="OpenAPI reference for this schema"
    )

    sql_constraints = [
        ("code_unique", "unique(code)", "Code must be unique per schema."),
        ("name_unique", "unique(name)", "Name must be unique per schema."),
    ]

    @api.depends("code")
    def _compute_oas_ref(self):
        for rec in self:
            if rec.code:
                rec.oas_ref = {"$ref": f"#components/schemas/{rec.code}"}
            else:
                rec.oas_ref = {"type": "string"}

    @api.depends("schema_text")
    def _compute_schema_json(self):
        for rec in self:
            try:
                rec.schema_json = rec.schema_text and json.loads(rec.schema_text) or {}
            except Exception:
                rec.schema_json = {}
            _logger.info("Computed schema_json for %s: %s", rec.name, rec.schema_json)

    @api.onchange("schema_text")
    def _onchange_schema_text_update_parents(self):
        for rec in self:
            refs = set()
            try:
                schema = json.loads(rec.schema_text or "{}")
                refs = self._find_refs(schema)
            except Exception as e:
                _logger.error("Error parsing schema_text for %s: %s", rec.name, e)
            # Kod ile eşleşen parent'ları bul
            parent_ids = self.env["ogcapi.component.schema"].search(
                [("code", "in", list(refs))]
            )
            rec.parent_ids = [(6, 0, parent_ids.ids)]

    @api.constrains("schema_text", "parent_ids")
    def _check_parent_ids_consistency(self):
        for rec in self:
            refs = set()
            try:
                schema = json.loads(rec.schema_text or "{}")
                refs = set(self._find_refs(schema))
            except Exception:
                refs = set()
            parent_codes = set(rec.parent_ids.mapped("code"))
            if not refs.issubset(parent_codes):
                raise ValidationError(
                    _("All $ref references must be selected in parent_ids!")
                )

    def _find_refs(self, obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if (
                    k == "$ref"
                    and isinstance(v, str)
                    and v.startswith("#/components/schemas/")
                ):
                    yield v.split("/")[-1]
                else:
                    yield from self._find_refs(v)
        elif isinstance(obj, list):
            for item in obj:
                yield from self._find_refs(item)

    @api.model
    def coerce_types(self, schema, params):
        """
        It converts the values in params to the appropriate type based on the schema.
        """
        for key, value in params.items():
            prop = schema.get("properties", {}).get(key)
            if not prop or value is None:
                continue
            typ = prop.get("type")
            try:
                if typ == "integer":
                    params[key] = int(value)
                elif typ == "number":
                    params[key] = float(value)
                if typ == "boolean":
                    if isinstance(value, str):
                        params[key] = value.lower() in ("true", "1", "yes")
                    else:
                        params[key] = bool(value)
            except Exception:
                _logger.warning(
                    "Could not coerce value '%s' for key '%s' to type '%s'",
                    value,
                    key,
                    typ,
                )
        return params

    def _create_default_validator(self):
        """Create a custom validator that sets default values"""

        def extend_with_default(validator_class):
            validate_properties = validator_class.VALIDATORS["properties"]

            def set_defaults(validator, properties, instance, schema):
                if not validator.is_type(instance, "object"):
                    return

                for prop, subschema in properties.items():
                    if "default" in subschema and instance.get(prop) is None:
                        instance[prop] = subschema["default"]

                for error in validate_properties(
                    validator, properties, instance, schema
                ):
                    yield error

            return validators.extend(validator_class, {"properties": set_defaults})

        return extend_with_default(jsonschema.Draft7Validator)

    @api.model
    def validate_schema(self, data, schema, use_defaults=True):
        """
        Validates data using a JSON Schema.
        """
        try:
            params = self.coerce_types(schema, data)
            if not isinstance(params, dict):
                return False, ["Data must be a dictionary"], None

            if not isinstance(schema, dict):
                return False, ["Schema must be a dictionary"], None

            data_copy = json.loads(json.dumps(params))

            if use_defaults:
                default_validator = self._create_default_validator()
                validator = default_validator(schema)

                errors = list(validator.iter_errors(data_copy))
                if errors:
                    # Tüm hata mesajlarını toplama
                    error_messages = []
                    for error in errors:
                        path = (
                            ".".join(str(p) for p in error.path)
                            if error.path
                            else "root"
                        )
                        error_messages.append(f"Error at '{path}': {error.message}")
                    return False, error_messages, data_copy
                else:
                    return True, None, data_copy

            else:
                validator = jsonschema.Draft7Validator(schema)

                errors = list(validator.iter_errors(data_copy))
                if errors:
                    # Tüm hata mesajlarını toplama
                    error_messages = []
                    for error in errors:
                        path = (
                            ".".join(str(p) for p in error.path)
                            if error.path
                            else "root"
                        )
                        error_messages.append(f"Error at '{path}': {error.message}")
                    return False, error_messages, data_copy
                else:
                    return True, None, data_copy

        except Exception as e:
            _logger.error("Schema validation error: %s", str(e))
            return False, [str(e)], data

    def get_oas(self):
        """
        Get the OpenAPI specification for this schema.
        :return: OpenAPI object.
        :rtype: dict
        """
        schemas = {}
        for record in self:
            parent_schemas = {}
            if record.parent_ids:
                parent_schemas = {
                    p.code: p.schema_json if p.schema_json else {"type": "string"}
                    for p in record.parent_ids
                }
            schemas[record.code] = (
                record.schema_json if record.schema_json else {"type": "string"}
            )
            schemas.update(parent_schemas)
        return schemas

    def get_schema_dict(self):
        """
        Get the schema dictionary for this schema.
        :return: Schema dictionary.
        :rtype: dict
        """
        schema_dict = {}
        if self.schema_json and isinstance(self.schema_json, dict):
            schema_dict = self.schema_json
        else:
            return {"type": "string"}
        schemas = self.search([("id", "!=", self.id)])
        schemas_dict = {
            schema.code: schema.schema_json or {"type": "string"} for schema in schemas
        }

        schema_dict["components"] = {"schemas": schemas_dict}
        return schema_dict
