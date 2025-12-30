# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, fields, models
from markupsafe import Markup


class ResPartner(models.Model):
    _inherit = "res.partner"

    display_address = fields.Char(compute="_compute_display_address")
    map_popup_info = fields.Html(compute="_compute_map_popup_info", sanitize=False)
    partner_type_label = fields.Char(compute="_compute_partner_type_label")
    contact_summary = fields.Char(compute="_compute_contact_summary")

    def _compute_display_address(self):
        for partner in self:
            partner.display_address = partner._display_address(without_company=True)

    @api.depends("phone", "email")
    def _compute_contact_summary(self):
        """Compute a summary of contact information"""
        for partner in self:
            parts = []
            if partner.phone:
                parts.append(f"📞 {partner.phone}")
            elif getattr(partner, "mobile", None):
                parts.append(f"📱 {partner.mobile}")
            if partner.email:
                parts.append(f"✉️ {partner.email}")
            partner.contact_summary = " | ".join(parts) if parts else ""

    @api.depends("is_company", "category_id")
    def _compute_partner_type_label(self):
        """Compute partner type label for display"""
        for partner in self:
            labels = []
            if partner.is_company:
                labels.append("🏢 Company")
            else:
                labels.append("👤 Individual")
            # customer_rank and supplier_rank are from sale module - use getattr for safety
            if getattr(partner, "customer_rank", 0) > 0:
                labels.append("🛒 Customer")
            if getattr(partner, "supplier_rank", 0) > 0:
                labels.append("📦 Vendor")
            partner.partner_type_label = " | ".join(labels)

    @api.depends(
        "display_name",
        "display_address",
        "phone",
        "email",
        "website",
        "is_company",
        "category_id",
        "partner_latitude",
        "partner_longitude",
        "user_id",
    )
    def _compute_map_popup_info(self):
        """Compute rich HTML content for map popup"""
        for partner in self:
            # Build HTML popup content
            html_parts = []

            # Partner type badges
            badges = []
            if partner.is_company:
                badges.append('<span class="badge bg-primary me-1">Company</span>')
            else:
                badges.append('<span class="badge bg-secondary me-1">Individual</span>')
            # customer_rank and supplier_rank are from sale module - use getattr for safety
            if getattr(partner, "customer_rank", 0) > 0:
                badges.append('<span class="badge bg-success me-1">Customer</span>')
            if getattr(partner, "supplier_rank", 0) > 0:
                badges.append('<span class="badge bg-warning me-1">Vendor</span>')

            if badges:
                html_parts.append(f'<div class="mb-2">{"".join(badges)}</div>')

            # Categories/Tags
            if partner.category_id:
                tags = " ".join(
                    [
                        f'<span class="badge bg-info me-1">{cat.name}</span>'
                        for cat in partner.category_id[:3]
                    ]
                )
                html_parts.append(f'<div class="mb-2">{tags}</div>')

            # Address
            if partner.display_address:
                html_parts.append(
                    f'<div class="mb-2"><i class="fa fa-map-marker text-danger"></i> '
                    f"{partner.display_address}</div>"
                )

            # Contact info
            contact_parts = []
            if partner.phone:
                contact_parts.append(
                    f'<a href="tel:{partner.phone}" class="text-decoration-none">'
                    f'<i class="fa fa-phone text-success"></i> {partner.phone}</a>'
                )
            mobile = getattr(partner, "mobile", None)
            if mobile:
                contact_parts.append(
                    f'<a href="tel:{mobile}" class="text-decoration-none">'
                    f'<i class="fa fa-mobile text-success"></i> {mobile}</a>'
                )
            if partner.email:
                contact_parts.append(
                    f'<a href="mailto:{partner.email}" class="text-decoration-none">'
                    f'<i class="fa fa-envelope text-primary"></i> {partner.email}</a>'
                )
            if partner.website:
                website_url = (
                    partner.website
                    if partner.website.startswith("http")
                    else f"https://{partner.website}"
                )
                contact_parts.append(
                    f'<a href="{website_url}" target="_blank" class="text-decoration-none">'
                    f'<i class="fa fa-globe text-info"></i> Website</a>'
                )

            if contact_parts:
                html_parts.append(
                    '<div class="mb-2">' + "<br/>".join(contact_parts) + "</div>"
                )

            # Salesperson
            if partner.user_id:
                html_parts.append(
                    f'<div class="mb-2 text-muted small">'
                    f'<i class="fa fa-user"></i> Salesperson: {partner.user_id.name}</div>'
                )

            # Total invoiced (if customer and account module installed)
            total_invoiced = getattr(partner, "total_invoiced", 0)
            if getattr(partner, "customer_rank", 0) > 0 and total_invoiced:
                currency = (
                    getattr(partner, "currency_id", None)
                    or partner.env.company.currency_id
                )
                html_parts.append(
                    f'<div class="mb-2 text-muted small">'
                    f'<i class="fa fa-money"></i> Total Invoiced: '
                    f"{currency.symbol}{total_invoiced:,.2f}</div>"
                )

            # Google Maps link
            if partner.partner_latitude and partner.partner_longitude:
                maps_url = (
                    f"https://www.google.com/maps/dir/?api=1&destination="
                    f"{partner.partner_latitude},{partner.partner_longitude}"
                )
                html_parts.append(
                    f'<div class="mt-2 pt-2 border-top">'
                    f'<a href="{maps_url}" target="_blank" '
                    f'class="btn btn-sm btn-outline-primary">'
                    f'<i class="fa fa-location-arrow"></i> Get Directions</a></div>'
                )

            partner.map_popup_info = Markup("".join(html_parts)) if html_parts else ""
