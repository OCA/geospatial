import logging

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class OgcapiApiPath(models.Model):
    """OGC API Path configuration repository"""

    _name = "ogcapi.api.path"
    _description = "OGC API Path Configuration"
    _rec_name = "complete_name"
    _order = "complete_name asc"

    name = fields.Char(
        required=True, translate=True, help="Name of the API path configuration"
    )
    code = fields.Selection(
        [
            ("ogcapi", "OGC API Root"),
            ("landing", "Landing Page"),
            ("conformance", "Conformance"),
            ("api", "OpenAPI"),
            ("collections", "Collections"),
            ("collection", "Collection"),
            ("schema", "Item Schema"),
            ("items", "Items"),
            ("item", "Item"),
        ],
        required=True,
        help="Unique code per path configuration",
    )

    description = fields.Text(help="Detailed description of the configuration")
    parent_id = fields.Many2one(
        "ogcapi.api.path",
        domain="[('id', '!=', id)]",
        ondelete="restrict",
        string="Parent",
        index=True,
        recursive=True,
    )
    child_ids = fields.One2many("ogcapi.api.path", "parent_id", string="Children")
    active = fields.Boolean(default=True)

    # Computed fields
    complete_name = fields.Char(
        compute="_compute_complete_name", store=True, recursive=True
    )
    parameter_ids = fields.Many2many(
        comodel_name="ogcapi.component.parameter",
        string="Path Parameters",
        compute="_compute_parameter_ids",
        store=True,
        recursive=True,
        help="List of path parameters for this API path",
    )

    # Relationships

    parameter_id = fields.Many2one(
        comodel_name="ogcapi.component.parameter",
        string="Path Parameter",
        domain="[('parameter_in', '=', 'path')]",
        ondelete="set null",
    )
    api_ids = fields.One2many("ogcapi.api", "path_id", string="Operations")

    # SQL Constraints
    _sql_constraints = [
        ("code_uniq", "unique(code)", "Configuration code must be unique!")
    ]

    # Constraints
    @api.constrains("parent_id")
    def _check_no_recursive_parent(self):
        for rec in self:
            parent = rec.parent_id
            while parent:
                if parent == rec:
                    raise UserError(_("Recursive parent relationship is not allowed!"))
                parent = parent.parent_id

    # Compute methods

    @api.depends("code", "parent_id.complete_name", "parameter_id")
    def _compute_complete_name(self):
        for record in self:
            parent_complete_name = (
                record.parent_id.complete_name if record.parent_id else ""
            )
            if record.parameter_id:
                param_code = "{%s}" % record.parameter_id.code
            else:
                param_code = record.code
            if not parent_complete_name:
                record.complete_name = "/%s" % param_code
            else:
                record.complete_name = "%s/%s" % (parent_complete_name, param_code)

    @api.depends("parameter_id", "parent_id.parameter_ids")
    def _compute_parameter_ids(self):
        for record in self:
            params = set(record.parent_id.parameter_ids.ids if record.parent_id else [])
            if record.parameter_id:
                params.add(record.parameter_id.id)
            record.parameter_ids = [(6, 0, list(params))]
