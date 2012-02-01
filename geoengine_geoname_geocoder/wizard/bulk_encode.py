# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
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