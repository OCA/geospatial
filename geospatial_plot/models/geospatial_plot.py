# Copyright 2025 Advance Insight
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class GeospatialPlot(models.Model):
    _name = "geospatial.plot"
    _inherit = ["mail.thread"]
    _description = "Geospatial Plot"
    _order = "partner_id"

    def default_get(self, fields_list):
        Partner = self.env["res.partner"]
        RCP = self.env["res.config.settings"].sudo()
        result = super().default_get(fields_list)
        partner_id = result.get("partner_id", False)
        partner = Partner.browse(partner_id) if partner_id else Partner
        if self._set_field_default(fields_list, result, "plot_uom_id"):
            plot_uom_id = (
                partner
                and partner.plot_uom_id
                or RCP._get_default_plot_uom_id()
                or self.env.ref("uom.uom_square_meter")
            )
            result["plot_uom_id"] = plot_uom_id.id
        if partner:
            if self._set_field_default(fields_list, result, "country_id"):
                result["country_id"] = partner.country_id.id
                result["country_code"] = partner.country_id.code
        return result

    def _set_field_default(self, fields_list, result, fieldname):
        return fieldname in fields_list and not result.get(fieldname, False)

    @api.model
    def _get_plot_uom_id_domain(self):
        return self.env["res.config.settings"]._get_plot_uom_id_domain()

    name = fields.Char(required=True, tracking=True)
    plot_shape_type = fields.Selection(
        selection=[
            ("circle", "Circle"),
            ("polygon", "Polygon"),
            ("rectangle", "Rectangle"),
        ],
    )
    partner_id = fields.Many2one(
        comodel_name="res.partner",
        domain="[('type', '=', 'contact')]",
        required=True,
        ondelete="cascade",
        tracking=True,
        index=True,
        help="The partner using the plot",
    )
    owner_id = fields.Many2one(
        comodel_name="res.partner",
        domain="[('type', '=', 'contact')]",
        ondelete="set null",
        tracking=True,
        index=True,
        help="The partner owning the plot",
    )
    partner_address_id = fields.Many2one(
        comodel_name="res.partner",
        string="Plot address",
        domain="[('type', '=', 'other')]",
        ondelete="set null",
        tracking=True,
        index=True,
        help="If the plot has its own address, separate from the using partner",
    )
    plot_description = fields.Text("Description")
    active = fields.Boolean(default=True, tracking=True)
    plot_uom_id = fields.Many2one(
        comodel_name="uom.uom",
        domain=lambda self: self._get_plot_uom_id_domain(),
        tracking=True,
        readonly=True,
    )
    plot_size = fields.Float(
        compute="_compute_plot_size",
        help="Plot size in selected unit of measurement",
    )
    plot_size_sqm = fields.Float(
        string="Plot size in square meter",
        required=True,
        tracking=True,
        help="This field will be set by drawing the plot",
    )
    plot_polygon = fields.Json(
        help="This field contains the actual plot coordinates",
    )
    country_id = fields.Many2one(
        comodel_name="res.country",
        compute="_compute_res_country",
        store=True,
        help="Used to set map to draw plot on",
    )
    country_code = fields.Char(related="country_id.code")

    @api.depends("partner_id")
    def _compute_country_id(self):
        """Take country from partner or active company."""
        for this in self:
            this.country_id = (
                this.partner_id.country_id
                or self.env.company.partner_id.country_id
                or self.env.ref("base.us")
            )

    @api.depends("plot_uom_id", "plot_size_sqm")
    def _compute_plot_size(self):
        reference_uom = self.env.ref("uom.uom_square_meter")
        for this in self:
            if not (this.plot_size_sqm and this.plot_uom_id):
                this.plot_size = 0.0
                continue
            this.plot_size = reference_uom._compute_quantity(
                this.plot_size_sqm, this.plot_uom_id
            )

    @api.constrains("plot_size_sqm")
    def _check_plot_size_sqm(self):
        for rec in self:
            if rec.plot_size_sqm < 0.0:
                raise ValidationError(_("Size of plot needs to be higher than 0."))
