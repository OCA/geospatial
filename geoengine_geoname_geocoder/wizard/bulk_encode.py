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

class BlukGeoNameEncoder(osv.osv_memory):
    _name = "geoengine.geoname.encoder"
    
    _columns = {'add_to_encode': fields.many2many('res.partner.address',
                                                  string='Addresses to encode'),
                'encode_all': fields.boolean('Encode all addresses')}
                
    def encode(self, cursor, uid, wiz_id, context=None):
        add_obj =  self.pool.get('res.partner.address')
        context = context or {}
        if isinstance(wiz_id, list):
            wiz_id = wiz_id[0]
        current = self.browse(cursor, uid, wiz_id, context)
        if current.encode_all :
            add_ids = add_obj.search(cursor, uid, [], context=context)
            add_list = add_obj.browse(cursor, uid, add_ids, context)
        else:
            add_list = current.add_to_encode or []
        for add in add_list:
            add.geocode_from_geonames(strict=False)
        return {}
BlukGeoNameEncoder()
