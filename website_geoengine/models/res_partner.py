from odoo import _, api, fields, models
from odoo.exceptions import ValidationError
import logging 
import json

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    _inherit = "res.partner"

    opening_hours = fields.Char(string="Opening hours")

    AUTHORIZED_FIELDS = ["name", "city", "zip", "street", "street2", "tag"]

    @api.model
    def get_search_tags(self, search, lang):
        _logger.info(f"get_search_tags: {search}")
        _logger.info(f"get_search_tags: {lang}")
        #TODO FILTER res_partner on is_store = True AND is_published = True AND website_published = True. And filter category_ids on partners as well
        sql = f"""
        WITH
            names as (SELECT DISTINCT 'name' as column, name as value FROM res_partner WHERE type='store'),
            cities as (SELECT DISTINCT 'city' as column, city as value FROM res_partner WHERE type='store'),
            zips as (SELECT DISTINCT 'zip' as column, zip as value FROM res_partner WHERE type='store'),
            streets as (SELECT DISTINCT 'street' as column, street as value FROM res_partner WHERE type='store'),
            tags as (
                SELECT DISTINCT 
                    'tag' as column, 
                    res_partner_category.name->>'{lang}' as value 
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
            all_tags as (SELECT * FROM names UNION SELECT * FROM cities UNION SELECT * FROM zips UNION SELECT * FROM streets UNION SELECT * FROM tags )

        
        SELECT * FROM all_tags WHERE value ILIKE '%{search}%';
        """
        self._cr.execute(sql)
        return self._cr.fetchall()

    @api.model
    def fetch_partner_geoengine(self, tags, lang):
        _logger.info(f"fetch_partner_geoengine: {tags}")
        _logger.info(f"fetch_partner_geoengine: {lang}")

        #todo base domaine: is_store
        domain = [("type", "=", "store")]
        domain = []
        for field in tags:
            value = tags[field]
            _logger.info(f"fetch_partner_geoengine: {field}: {value}")
            if field not in self.AUTHORIZED_FIELDS:
                raise ValidationError(_("Unauthorized field"))
            domain.append((field.replace('tag', 'category_id.name'), "ilike", value))
        
        partners = self.sudo().search(domain)
        features = []

        for partner in partners:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [partner.partner_longitude, partner.partner_latitude]},
                    "properties": {
                        "id": partner.id or None,
                        "name": partner.name or '',
                        "zip": partner.zip or '',
                        "city": partner.city or '',
                        "street": partner.street or '',
                        "street2": partner.street2 or '',
                        "tags": partner.category_id.mapped('name') or '',
                        
                        "opening_hours": partner.opening_hours or '',
                    },
                }
            )
        return features
