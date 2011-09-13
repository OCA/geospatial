# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
import json
import pprint

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
        
    def fields_view_get(self, cursor, uid, view_id=None, view_type='form', context=None, toolbar=False, submenu=False):
        """Return information about the available fields of the class if view type == 'map' return geographical columns
        available  WORK IN PROGESS"""
        raster_obj = self.pool.get('geoengine.raster.layer')
        vector_obj = self.pool.get('geoengine.vector.layer')
        field_obj = self.pool.get('ir.model.fields')
        def set_field_real_name(in_tuple):
            if not in_tuple:
                return in_tuple
            name = field_obj.read(cursor, uid, in_tuple[0], ['name'])['name']
            out = (in_tuple[0], name, in_tuple[1])
            return out
        is_map = False
        if view_type == "map":
            is_map = True
        view_type = 'form' ## we use the form defined in arch in order to get attribute and tooltip view
        res = super(GeoModel, self).fields_view_get(cursor, uid, view_id, view_type, context, toolbar, submenu)
        if is_map :
            view = self.pool.get('ir.ui.view').browse(cursor, uid, view_id)
            res['background'] = []
            res['actives'] = []
            for layer in view.raster_layer_ids:
                layer_dict = raster_obj.read(cursor, uid, layer.id, context)
                res['background'].append(layer_dict)
            for layer in view.vector_layer_ids:
                layer_dict = vector_obj.read(cursor, uid, layer.id, context)
                layer_dict['attribute_field_id'] = set_field_real_name(layer_dict['attribute_field_id'])
                layer_dict['geo_field_id'] = set_field_real_name(layer_dict['geo_field_id'])
                res['actives'].append(layer_dict)

        return res
