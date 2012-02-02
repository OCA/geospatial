# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
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
                                                  srid=900913, # optional arg
                                                  dim=2)} # optional arg
ResPartner()

