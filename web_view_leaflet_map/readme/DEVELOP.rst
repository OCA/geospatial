Create a new view :

.. code-block:: xml

    <record id="view_my_model_map" model="ir.ui.view">
        <field name="model">my.model</field>
        <field name="arch" type="xml">
            <leaflet_map
                    field_latitude="FIELD_LATITUDE"
                    field_longitude="FIELD_LONGITUDE"
                    field_title="FIELD_TITLE"
                    field_address="FIELD_ADDRESS"
                    field_marker_icon_image="FIELD_MARKER_ICON_IMAGE"
                >
                <field name="__last_update"/>
                <field name="FIELD_LATITUDE"/>
                <field name="FIELD_LONGITUDE"/>
                <field name="FIELD_TITLE"/>
                <field name="FIELD_ADDRESS"/>
            </leaflet_map>
        </field>
    </record>

1. FIELD_LATITUDE and FIELD_LONGITUDE are the name of the fields that contains GPS coordinates of the model.
2. FIELD_TITLE will be used when the popup is displayed, as a title.
3. FIELD_ADDRESS will be used when the popup is displayed to display the adress.
4. (optional) FIELD_MARKER_ICON_IMAGE, is the name of the image field to place as an icon
   of the marker.
   Note: You can set extra settings ``marker_icon_size_x``, ``marker_icon_size_y``, to define
   the size of the image, and ``marker_popup_anchor_x``, ``marker_popup_anchor_y`` to define
   the position of the popup.

Map options :

- ``default_zoom`` : define the default zoom value. (7 if not defined)
- ``max_zoom`` : define the max zoom value. (19 if not defined)
- ``zoom_snap`` : define the zoom level in each change. (1 if not defined)

* Create or update an action for the model

.. code-block:: xml

    <record id="my_module.action_my_model" model="ir.actions.act_window">
        <field name="view_mode">tree,form,leaflet_map</field>
    </record>

**Library Update**

For the time being, the module embed the lealflet.js library version 1.8.0 ( released on April 18, 2022.)

If a new release is out:

- please download it here https://leafletjs.com/download.html
- update the javascript, css and images, present in the folder ``static/lib/leaflet``
- test the features
- make a Pull Request

**Default position in the map**

By default, the position of the map is defined by the user, in the function
``get_default_leaflet_position``. It returns the position of the current company, if defined.
you can overload this function globally, or per model.
