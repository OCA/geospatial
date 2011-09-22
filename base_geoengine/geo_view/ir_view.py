# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from osv import fields, osv


GEO_VIEW = ('geoengine', 'GeoEngine')

class IrUIView(osv.osv):
    _inherit = 'ir.ui.view'

    def __init__(self, pool, cursor):
        """Hack due to the lack of selection fields inheritance mechanism."""
        super(IrUIView, self).__init__(pool, cursor)
        type_selection = self._columns['type'].selection
        if GEO_VIEW not in type_selection:
            tmp = list(type_selection)
            tmp.append(GEO_VIEW)
            tmp.sort()
            self._columns['type'].selection = tuple(set(tmp))

    _columns = {'raster_layer_ids': fields.one2many('geoengine.raster.layer',
                                                    'view_id',
                                                    'Raster layers',
                                                    required=False),

                'vector_layer_ids': fields.one2many('geoengine.vector.layer',
                                                    'view_id',
                                                    'Vector layers',
                                                    required=True),
                'default_extent':fields.char('Default map extent in 900913', size=128)}

    _defaults = {'default_extent': lambda *a: '-123164.85222423, 5574694.9538936, 1578017.6490538, 6186191.1800898'}
IrUIView()
