## 16.0.1.0.0 (2023-03-20)

- LayerSwitcher has been removed as it was not really practical. A
  LayerPanel is now active.
- The geo_search method is now deprecated and replaced by the standard
  odoo search method.
- The widget "geo_edit_map" attribute is no longer necessary as the
  field is automatically detected by his type. We can also provide an
  option attribute that allows us to pass an opacity and a color as
  parameters.

``` xml
<form>
    <notebook colspan="4">
        <page string="Geometry">
            <field name="the_geom" options="{'opacity': 0.8, 'color': '#0000FF' }" />
        </page>
    </notebook>
</form>
```

- The method geo_search is now deprecated. We now need to use the
  standard odoo search method.

``` python
obj.search([("the_point","geo_intersect",{"dummy.zip.the_geom": [("id", "=", rec.id)]})])
```

- We can now pass to the geoengine view a template to display the
  information we want to see when clicking on a feature.

``` xml
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
```

- We can now pass a model to use to a layer to display other information
  on the map.

``` xml
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
```

- There is some new features in the LayerPanel.

1.  If you are logged in as an admin, you have the possibility to edit
    the layer by clicking on the edit button. This will open a dialog
    box. Changes will appear in real time on the view.
2.  If you are logged in as an admin, you can also change the domain of
    the layer. If you are logged in as a user, changes will not be
    persisted in the database. Changes will appear in real time on the
    view.
3.  If you are logged in as an admin, you can also change the sequence
    of the layers by sliding them over each other. If you are logged in
    as a user, changes will not be persisted in the database.

- Widget domain is now implemented for geo field This means that the
  geo-operators are also implemented and that there is the possibility
  to add a sub-domain. If we want to add a domain that includes all the
  records that are displayed in the geoengine view (active_ids). We can
  use the two new operators : "in active_ids" and "not in active_ids".
  These will automatically replace the marker with ids. Note that the
  widget will indicate that the domain is invalid because of the marker.
- Creation of the RecordsPanel. This panel allows you to retrieve all
  active records. You can click on record to get the movement to the
  selected record. Two magnifying glass are also available. You can
  click on the left one to zoom on the record. You can click on the
  right one to get the original zoom.
- A search bar is also available. It allows you to perform a search into
  the RecordsPanel.
- A button to open/close the panels is also available.
- The module has been translated in French.
- Now you can now make the geoengine view editable. Simply add editable
  attribute in the geoengine view.

``` xml
<geoengine editable="1">
    <field name="name" />
    <field name="city" />
    <field name="total_sales" />
    <field name="the_geom" />
    <field name="display_name" />
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

Thanks to that, you can create new records by drawing them directly in the geoengine view. You can also edit record in the same view.
```
