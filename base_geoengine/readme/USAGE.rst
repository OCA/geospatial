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
