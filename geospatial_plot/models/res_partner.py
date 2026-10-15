# Copyright 2025 Advance Insight
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import _, api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    def default_get(self, fields_list):
        result = super().default_get(fields_list)
        RCP = self.env["res.config.settings"].sudo()
        if "plot_uom_id" in fields_list and not result.get("plot_uom_id", False):
            plot_uom_id = RCP._get_default_plot_uom_id() or self.env.ref(
                "uom.uom_square_meter"
            )
            result["plot_uom_id"] = plot_uom_id.id
        return result

    @api.model
    def _get_plot_uom_id_domain(self):
        return self.env["res.config.settings"]._get_plot_uom_id_domain()

    plot_ids = fields.One2many(
        "geospatial.plot", "partner_id", "Area in use", copy=False
    )
    plot_uom_id = fields.Many2one(
        "uom.uom",
        "Land Area Unit of Measure",
        domain=lambda self: self._get_plot_uom_id_domain(),
        tracking=True,
    )
    own_acreage = fields.Float(
        "Own Plot Acreage",
        compute="_compute_land_acreage",
        store=True,
        tracking=True,
    )
    leased_acreage = fields.Float(
        "Leased Plot Acreage",
        compute="_compute_land_acreage",
        store=True,
        tracking=True,
    )
    total_acreage = fields.Float(
        "Total Plot Acreage",
        compute="_compute_acreage",
        store=True,
    )

    @api.depends(
        "plot_uom_id",
        "plot_ids",
        "plot_ids.plot_size_sqm",
        "plot_ids.owner_id",
    )
    def _compute_land_acreage(self):
        for this in self:
            if not this.plot_ids:
                this.own_acreage = 0.0
                this.leased_acreage = 0.0
                this.total_acreage = 0.0
                continue
            owned_plots = this.plot_ids.filtered(
                lambda r: not r.owner_id or r.partner_id == r.owner_id
            )
            leased_plots = this.plot_ids - owned_plots
            if not owned_plots:
                this.own_acreage = 0.0
            else:
                acreage_owned_sqm = sum(owned_plots.mapped("plot_size_sqm"))
                this.own_acreage = this._compute_land_acreage_uom(acreage_owned_sqm)
            if not leased_plots:
                this.leased_acreage = 0.0
            else:
                acreage_leased_sqm = sum(leased_plots.mapped("plot_size_sqm"))
                this.leased_acreage = this._compute_land_acreage_uom(acreage_leased_sqm)
            this.total_acreage = this.own_acreage + this.leased_acreage

    def _compute_land_acreage_uom(self, acreage_sqm):
        """Compute plot size in selected unit of measurement."""
        self.ensure_one()
        reference_uom = self.env.ref("uom.uom_square_meter")
        return reference_uom._compute_quantity(acreage_sqm, self.plot_uom_id)

    def action_create_plot(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": _("New Plot Of %s") % self.display_name,
            "res_model": "geospatial.plot",
            "view_mode": "form",
            "target": "new",
            "context": {
                "default_partner_id": self.id,
                "default_name": _(
                    "%(display_name)s Plot #%(plot_count)d",
                    display_name=self.display_name,
                    plot_count=len(self.plot_ids) + 1,
                ),
                "plot_partner_readonly": True,
            },
        }
