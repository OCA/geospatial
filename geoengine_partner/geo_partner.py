# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################

from osv import fields, osv

from base_geoengine import geo_model

class ResPartnerAddress(geo_model.GeoModel):
    """Add geo_point to addresses"""
    _name = "res.partner.address"
    _inherit = "res.partner.address"
    _columns = {'geo_point' : fields.geo_point('Addresses coordinate')}
ResPartnerAddress()

class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function filed"""
    _name = "res.partner"
    _inherit = "res.partner"
    
    def _get_point(self, cursor, uid, partner_ids, name, args, context=None):
        """ Return Json repr of field"""
        res = {}
        add_obj = self.pool.get('res.partner.address')
        context = context or {}
        if not isinstance(partner_ids, list):
            partner_ids = [partner_ids]
        for partner_id in partner_ids:
            add = self.address_get(cursor, uid, [partner_id], adr_pref=['invoice'])
            if add.get('invoice'):
                res[partner_id] = add_obj.browse(cursor, uid, add.get('invoice'), context).geo_point
            else:
               res[partner_id] = False 
        return res
            
    _columns = {'geo_point' : fields.geo_function(_get_point, 
                                                  string='Partner coordinates',
                                                  type='geo_point',
                                                  srid=900913, # mandatory arg
                                                  dim=2)} # mandatory arg
ResPartner()

