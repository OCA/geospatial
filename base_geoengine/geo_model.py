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


#    def to_geojson(self, cursor, uid, ids, geom_fields=[], fields=[], context=None):
#        """Convert Browse record instance passed in id into geojson collection and layer definition
#        geom_field retraint the geo columns to be used
#        fields restraint attribute field to be used.
#        Actually only 'char', 'float', 'integer', 'text', 'boolean', 'selection', geom
#        columns can be jsonized"""
#        context = context or {}
#        indicator_fields = list(set([x['variable'] for x in self._georepr]))
#        if not geom_fields :
#            geom_fields = list(set([x['geometry'] for x in self._georepr]))
#        base_dict = {'geojson': {}, 'layers': self._georepr}
#        base_feat_dict = {'type': 'FeatureCollection', 'features': []}
#        if not fields:
#            fields = self._columns.keys()
#        if not isinstance(ids, list):
#            ids = [ids]
#        for geom_field in geom_fields:
#            if self._columns[geom_field]._type != 'geom':
#                raise Exception('Invalid colum to be query to json %s', kol)
#        supported_fields = []
#        for f in fields:
#            if self._columns[f]._type not in ('char', 'float', 'integer', 'text', 'boolean', 'selection', 'many2one'):
#                print 'Json serialization not supported for relation '+f+self._columns[f]._type
#            else:
#                supported_fields.append(f)
#        for br_inst in self.browse(cursor, uid, ids, context):
#            for geom_field in geom_fields:
#                cursor.execute('select ST_AsGeoJSON(%s) from %s where id = %s'%(geom_field, self._table, br_inst.id))
#                res = cursor.fetchone()
#                if not res:
#                    continue
#                if not res[0]:
#                    continue
#                feature_dict = {'geometry': False, 'properties':{}}
#                geojsonstring = res[0]
#                geom = json.loads(geojsonstring)
#                feature_dict['properties']['id'] = br_inst.id
#                feature_dict['geometry'] = geom
#                for fi in supported_fields:
#                    val = br_inst[fi]
#                    ##if fields is in indicator we want to keep even if false
#                    if  val or fi in indicator_fields:
#                        if fi in ('active',):
#                            continue
#                        if self._columns[fi]._type == "many2one" :
#                            feature_dict['properties'][fi] = val and val.name or False
#                        else:
#                            feature_dict['properties'][fi] = val
#                base_feat_dict['features'].append(feature_dict)
#        base_dict['geojson'] = base_feat_dict
#        res = json.dumps(base_dict,indent=4)
#        return res
#
#    def from_geojson(self, cursor, uid, ids, geom_field, fields=None, collection='', context=None):
#        print 'not implemented'

    def fields_view_get(self, cursor, user, view_id=None, view_type='form', context=None, toolbar=False, submenu=False):
        """Return information about the available fields of the class if view type == 'map' return geographical columns
        available  WORK IN PROGESS"""
        is_map = False
        field_obj = self.pool.get('ir.model.fields')
        if view_type == "map":
            is_map = True
        view_type = 'form'
        res = super(GeoModel, self).fields_view_get(cursor, user, view_id, view_type, context, toolbar, submenu)
        if is_map :
            geo_field_ids = field_obj.search(cursor, user, [('ttype','=', 'geo_'), ('model', '=', self._name)])
            if not geo_field_ids:
                return res
            for geo_field in field_obj.browse(cursor, user, geo_field_ids):
                res['fields'][geo_field.name] = {
                                                    'type': geo_field._geo_type,
                                                    'selectable': geo_field.selectable,
                                                    'select': 2,
                                                    'string': geo_field.field_description,
                                                    'views': {}
                }
        return res
