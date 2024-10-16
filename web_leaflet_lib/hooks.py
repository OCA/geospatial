def pre_init_hook(cr):
    # move configuration from web_view_leaflet_map
    # into web_leaflet_lib, if exists.
    cr.execute(
        """
        UPDATE ir_model_data
        SET module='web_leaflet_lib'
        WHERE module = 'web_view_leaflet_map'
        AND name in (
            'config_parameter_leaflet_copyright',
            'config_parameter_leaflet_tile_url'
        )
    """
    )
