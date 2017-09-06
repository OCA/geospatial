# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import _, api, models
from odoo.exceptions import except_orm, MissingError
from . import geo_operators
from . import fields as geo_fields


DEFAULT_EXTENT = ('-123164.85222423, 5574694.9538936, '
                  '1578017.6490538, 6186191.1800898')


class GeoModel(models.BaseModel):
    """Base class for all models defining geo fields.
    """

    # Array of ash that define layer and data to use
    _georepr = []
    _name = None
    _auto = True
    # not visible in ORM registry, meant to be python-inherited only
    _register = False
    _transient = False  # True in a TransientModel

    @api.model_cr_context
    def _auto_init(self):
        """Initialize the columns in dB and Create the GIST index
        only create and update supported

        We override the base methid  because creation of fields in DB is not
        actually delegated to the field it self but to the ORM _auto_init
        function
        """
        cr = self._cr

        geo_fields = {}
        for f_name, field in self._fields.iteritems():
            if field.type.startswith('geo_'):
                geo_fields[f_name] = field
        res = super(GeoModel, self)._auto_init()
        column_data = self._select_column_data()
        for f_name, geo_field in geo_fields.iteritems():
            if geo_field.compute and not geo_field.store:
                continue
            fct = geo_field.create_geo_column
            if f_name in column_data:
                fct = geo_field.update_geo_column
            fct(cr, f_name, self._table, self._name)
        return res

    @api.model
    def fields_get(self, allfields=None, attributes=None):
        """Add geo_type definition for geo fields"""
        res = super(GeoModel, self).fields_get(
            allfields=allfields, attributes=attributes)
        for f_name in res:
            field = self._fields.get(f_name)
            if field and field.type.startswith('geo_'):
                geo_type = {'type': field.type,
                            'dim': field.dim,
                            'srid': field.srid}
                if field.compute or field.related:
                    if not field.dim:
                        geo_type['dim'] = 2
                    if not field.srid:
                        geo_type['srid'] = 900913
                res[f_name]['geo_type'] = geo_type
        return res

    @api.model
    def _get_geo_view(self):
        geo_view = self.env['ir.ui.view'].search(
            [('model', '=', self._name),
             ('type', '=', 'geoengine')], limit=1)
        if not geo_view:
            raise except_orm(
                _('No GeoEngine view defined for the model %s') % self._name,
                _('Please create a view or modify view mode'))
        return geo_view

    @api.model
    def fields_view_get(self, view_id=None, view_type='form',
                        toolbar=False, submenu=False):
        """Returns information about the available fields of the class.
           If view type == 'map' returns geographical columns available"""
        view_obj = self.env['ir.ui.view']
        field_obj = self.env['ir.model.fields']

        def set_field_real_name(in_tuple):
            if not in_tuple:
                return in_tuple
            name = field_obj.browse(in_tuple[0]).name
            out = (in_tuple[0], name, in_tuple[1])
            return out
        if view_type == "geoengine":
            if not view_id:
                view = self._get_geo_view()
            else:
                view = view_obj.browse(view_id)
            res = super(GeoModel, self).fields_view_get(
                view_id=view.id, view_type='form', toolbar=toolbar,
                submenu=submenu)
            res['geoengine_layers'] = {
                'backgrounds': [],
                'actives': [],
                'projection': view.projection,
                'restricted_extent': view.restricted_extent,
                'default_extent': view.default_extent or DEFAULT_EXTENT,
                'default_zoom': view.default_zoom,
            }
            # XXX still the case ?
            # TODO find why context in read does not work with webclient
            for layer in view.raster_layer_ids:
                layer_dict = layer.read()[0]
                res['geoengine_layers']['backgrounds'].append(layer_dict)
            for layer in view.vector_layer_ids:
                layer_dict = layer.read()[0]
                # get category groups for this vector layer
                if layer.geo_repr == 'basic' and layer.symbol_ids:
                    layer_dict['symbols'] = layer.symbol_ids.read(
                        ['img', 'fieldname', 'value'])
                layer_dict['attribute_field_id'] = set_field_real_name(
                    layer_dict.get('attribute_field_id', False))
                layer_dict['geo_field_id'] = set_field_real_name(
                    layer_dict.get('geo_field_id', False))
                res['geoengine_layers']['actives'].append(layer_dict)
                # adding geo column desc
                geo_f_name = layer_dict['geo_field_id'][1]
                res['fields'].update(
                    self.fields_get([geo_f_name]))
        else:
            return super(GeoModel, self).fields_view_get(
                view_id=view_id, view_type=view_type, toolbar=toolbar,
                submenu=submenu)
        return res

    @api.model
    def get_edit_info_for_geo_column(self, column):
        raster_obj = self.env['geoengine.raster.layer']

        field = self._fields.get(column)
        if not field or not isinstance(field, geo_fields.GeoField):
            raise ValueError(
                _("%s column does not exists or is not a geo field") % column)
        view = self._get_geo_view()
        raster = raster_obj.search([('view_id', '=', view.id),
                                    ('use_to_edit', '=', True)], limit=1)
        if not raster:
            raster = raster_obj.search([('view_id', '=', view.id)], limit=1)
        if not raster:
            raise MissingError(_('No raster layer for view %s') % (view.name,))
        return {
            'edit_raster': raster.read()[0],
            'geo_type': field.geo_type,
            'srid': field.srid,
            'projection': view.projection,
            'restricted_extent': view.restricted_extent,
            'default_extent': view.default_extent,
            'default_zoom': view.default_zoom,
        }

    @api.model
    def geo_search(self, domain=None, geo_domain=None, offset=0,
                   limit=None, order=None):
        """Perform a geo search it allows direct domain:
           geo_search(
               domain=[('name', 'ilike', 'toto']),
               geo_domain=[('the_point', 'geo_intersect',
                             myshaply_obj or mywkt or mygeojson)])

           We can also support indirect geo_domain (
              ‘geom’, ‘geo_operator’, {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })

           The supported operators are :
            * geo_greater
            * geo_lesser
            * geo_equal
            * geo_touch
            * geo_within
            * geo_contains
            * geo_intersect"""
        # First we do a standard search in order to apply security rules
        # and do a search on standard attributes
        # Limit and offset are managed after, we may loose a lot of performance
        # here
        domain = domain or []
        geo_domain = geo_domain or []
        return geo_operators.geo_search(
            self, domain=domain, geo_domain=geo_domain,
            offset=offset, limit=limit, order=order)
