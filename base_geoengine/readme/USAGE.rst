Widget
======

The widget can be used on geometry fields::

  <record id="some_model_form_view" model="ir.ui.view">
    <field name="name">Some form view</field>
    <field name="model">some.model</field>
    <field name="arch" type="xml">
      <form>
      ...
        <field name="geom1" widget="geo_edit_map" options="{'add_layer_fields': ['geom2']}"/>
        <field name="geom2" invisible="1"/>
      ...
      </form>
    </field>
  </record>


Options can contain other geometry fields to display them on the same map
as a readonly layer.

Important changes in version 11
===============================

The geometry attributes must now be explicitly mentioned in the list of fields of
the XML geoengine view definitions. For instance::

  <record id="some_model_geo_view" model="ir.ui.view">
    <field name="name">Some data view</field>
    <field name="model">some.model</field>
    <field name="arch" type="xml">
      <geoengine>
        <field name="name" select="1"/>
        <field name="the_geom"/>
      </geoengine>
    </field>
  </record>
