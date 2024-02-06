# Copyright 2011-2024 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ResPartner(models.Model):
    _inherit = "res.partner"

    opening_hours = fields.Char(string="Opening hours")

    AUTHORIZED_FIELDS = ["name", "city", "zip", "street", "street2", "tag"]

    @api.model
    def get_search_tags(self, search, lang):
        sql = """
        WITH
            names as (
                SELECT
                    DISTINCT 'name' as column,
                    name as value
                FROM
                    res_partner
                WHERE
                    type='store'),
            cities as (
                SELECT
                    DISTINCT 'city' as column,
                    city as value
                FROM
                    res_partner
                WHERE
                    type='store'),
            zips as (
                SELECT
                    DISTINCT 'zip' as column,
                    zip as value
                FROM
                    res_partner
                WHERE
                    type='store'),
            streets as (
                SELECT
                    DISTINCT 'street' as column,
                    concat(street, street2) as value
                FROM
                    res_partner
                WHERE
                    type='store'),
            tags as (
                SELECT
                    DISTINCT 'tag' as column,
                    res_partner_category.name->>%s as value
                FROM
                    res_partner_category,
                    res_partner_res_partner_category_rel,
                    res_partner
                WHERE
                    res_partner_res_partner_category_rel.partner_id = res_partner.id
                    AND
                    res_partner_res_partner_category_rel.category_id = res_partner_category.id
                    AND res_partner.type='store'
            ),
            all_tags as (
                SELECT * FROM names
                UNION SELECT * FROM cities
                UNION SELECT * FROM zips
                UNION SELECT * FROM streets
                UNION SELECT * FROM tags )


        SELECT * FROM all_tags WHERE value ILIKE %s;
        """
        self._cr.execute(sql, (lang, f"%{search}%"))
        results = self._cr.fetchall()
        return results

    @api.model
    def fetch_partner_geoengine(self, tags, lang, maxResults):
        domain = [("type", "=", "store")]
        for tag in tags:
            field, value = tag.values()
            if field not in self.AUTHORIZED_FIELDS:
                raise ValidationError(_("Unauthorized field"))
            domain.append((field.replace("tag", "category_id.name"), "ilike", value))

        partners = self.sudo().search(domain)
        features = []

        if len(partners) > int(maxResults):
            return {
                "error": "Too many results",
                "message": f"Too many results: {len(partners)}",
            }

        for partner in partners:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            partner.partner_longitude,
                            partner.partner_latitude,
                        ],
                    },
                    "properties": {
                        "id": partner.id or None,
                        "name": partner.name or "",
                        "zip": partner.zip or "",
                        "city": partner.city or "",
                        "street": partner.street or "",
                        "street2": partner.street2 or "",
                        "tags": partner.category_id.mapped("name") or "",
                        "opening_hours": partner.opening_hours or "",
                    },
                }
            )
        return features
