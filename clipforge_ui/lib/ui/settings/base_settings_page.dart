import 'package:flutter/material.dart';

import 'package:clipforge_ui/config/config_service.dart';
import 'package:clipforge_ui/config/models/config.dart';

class BaseSettingsPage extends StatefulWidget {
  final ConfigService configService;
  final Config config;

  const BaseSettingsPage({
    super.key,
    required this.configService,
    required this.config,
  });

  @override
  State<StatefulWidget> createState() {
    // TODO: implement createState
    throw UnimplementedError();
  }
}
