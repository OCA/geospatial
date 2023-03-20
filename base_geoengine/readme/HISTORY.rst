=======================
16.0.1.0.0 (2023-03-20)
=======================
* LayerSwitcher has been removed as it was not really practical. A LayerPanel is now active.
* The geo_search method is now deprecated and replaced by the standard odoo search method.
* The widget "geo_edit_map" attribute is no longer necessary as the field is automatically detected by
  his type. We can also provide an option attribute that allows us to pass an opacity and a color as
  parameters.

.. code-block:: xml

    <form>
        <notebook colspan="4">
            <page string="Geometry">
                <field name="the_geom" options="{'opacity': 0.8, 'color': '#0000FF' }" />
            </page>
        </notebook>
    </form>

* The method geo_search is now deprecated. We now need to use the standard odoo search method.

.. code-block:: python

    obj.search([("the_point","geo_intersect",{"dummy.zip.the_geom": [("id", "=", rec.id)]})])

* We can now pass to the geoengine view a template to display the information we want
  to see when clicking on a feature.

.. code-block:: xml

    <geoengine>
        <field name="name" />
        <field name="city" />
        <field name="total_sales" />
        <field name="the_geom" />
        <templates>
            <t t-name="info_box">
                <field name="city" widget="badge" />
                <ul>
                    <li>ZIP : <field name="name" />
                    </li>
                    <li>Total Sales: <field name="total_sales" />
                    </li>
                </ul>
            </t>
        </templates>
    </geoengine>

* We can now pass a model to use to a layer to display other information on the map.

.. code-block:: xml

    <record id="geoengine_vector_layer_hs_retail_machines" model="geoengine.vector.layer">
        <field name="model_id" ref="base_geoengine_demo.model_geoengine_demo_automatic_retailing_machine"/>
        <field name="model_domain">[('state', '=', 'hs')]</field>
        <field name="geo_field_id" ref="base_geoengine_demo.field_geoengine_demo_automatic_retailing_machine__the_point"/>
        <field name="name">HS retail machines</field>
        <field name="view_id" ref="ir_ui_view_resbetterzipgeoview0" />
        <field name="geo_repr">basic</field>
        <field name="attribute_field_id" ref="base_geoengine_demo.field_geoengine_demo_automatic_retailing_machine__name"/>
        <field name="begin_color">#FF0000</field>
        <field name="display_polygon_labels" eval="0" />
        <field name="layer_opacity">0.8</field>
    </record>
