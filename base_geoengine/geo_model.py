# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
import json

from osv import fields, osv, orm
from tools.translate import _
from . import geo_field
from . import  geo_db


class GeoModel(orm.orm):
    #Array of ash that define layer and data to use
    _georepr = []


    def _auto_init(self, cursor, context=None):
        ## We do this because actually creation of fields in DB is not actually
        ## delegated to the field it self but to the ORM _auto_init function
        """Initialize the columns in dB and Create the GIST index
        only create and update supported"""
        columns = {}
        geo_columns = {}
        tmp = {}
        geo_db.init_postgis(cursor)
        for kol in self._columns:
            tmp[kol] = self._columns[kol]
            k_obj = self._columns[kol]
            if k_obj._type.startswith('geo_'):
                geo_columns[kol] = self._columns[kol]
            else:
                columns[kol] = self._columns[kol]
        self._columns = columns
        res = super(GeoModel, self)._auto_init(cursor, context)
        if geo_columns:
            cursor.execute("SELECT tablename from pg_tables where tablename='spatial_ref_sys';")
            check = cursor.fetchone()
            if not check:
                raise Exception(_('Can not install GeoEngine PostGIS does not seems'
                                  ' to be installed or spatial_sys_ref table not initialized'
                                  ' Please go to http://postgis.refractions.net/docs/ch02.html'
                                  ' for more information.'
                                  ' You can also use script create_postgis_template.sh'
                                  ' available in module'))
        for kol in geo_columns:
            geo_columns[kol].manage_db_column(cursor,
                                              kol,
                                              geo_columns[kol],
                                              self._table,
                                              self._name)

        self._columns = tmp
        self._field_create(cursor, context)
        return res

    def fields_get(self, cursor, uid, fields=None, context=None):
        """Add geo_type definition for geo fields"""
        res = super(GeoModel, self).fields_get(cursor, uid, fields=fields, context=context)
        for field in res:
            if field in self._columns:
                col = self._columns[field]
                if col._type.startswith('geo_'):
                    res[field]['geo_type'] = {'type': col._geo_type,
                                              'dim': col._dim,
                                              'srid':col._srid}
        return res

    def fields_view_get(self, cursor, uid, view_id=None, view_type='form',
                        context=None, toolbar=False, submenu=False):
        """Return information about the available fields of the class.
           If view type == 'map' return geographical columns available"""
        view_obj = self.pool.get('ir.ui.view')
        raster_obj = self.pool.get('geoengine.raster.layer')
        vector_obj = self.pool.get('geoengine.vector.layer')
        field_obj = self.pool.get('ir.model.fields')
        def set_field_real_name(in_tuple):
            if not in_tuple:
                return in_tuple
            name = field_obj.read(cursor, uid, in_tuple[0], ['name'])['name']
            out = (in_tuple[0], name, in_tuple[1])
            return out
        if view_type == "geoengine":
            res = super(GeoModel, self).fields_view_get(cursor, uid, view_id,
                                                        'form', context, toolbar, submenu)
            if not view_id:
                geo_view_id = view_obj.search(cursor, uid,
                                              [('model', '=', self._name), ('type', '=', 'geoengine')])
                if not geo_view_id:
                    raise osv.except_osv(_('No GeoEngine view defined for the model %s') % (self._name,),
                                         _('Please create a view or modifiy action view mode'))
                view = view_obj.browse(cursor, uid, geo_view_id[0])
            else:
                view = view_obj.browse(cursor, uid, view_id)
            res['geoengine_layers'] = {}
            res['geoengine_layers']['backgrounds'] = []
            res['geoengine_layers']['actives'] = []
            # TODO find why context in read does not work with webclient
            for layer in view.raster_layer_ids:
                layer_dict = raster_obj.read(cursor, uid, layer.id)
                res['geoengine_layers']['backgrounds'].append(layer_dict)
            for layer in view.vector_layer_ids:
                layer_dict = vector_obj.read(cursor, uid, layer.id)
                layer_dict['attribute_field_id'] = set_field_real_name(layer_dict.get('attribute_field_id', False))
                layer_dict['geo_field_id'] = set_field_real_name(layer_dict.get('geo_field_id', False))
                res['geoengine_layers']['actives'].append(layer_dict)
        else:
            return super(GeoModel, self).fields_view_get(cursor, uid, view_id, view_type, context, toolbar, submenu)
        return res
