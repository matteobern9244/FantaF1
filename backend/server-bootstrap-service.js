class DatabaseConnectionService {
  constructor({
    mongoose,
    resolveMongoDatabaseName,
    verifyMongoDatabaseName,
    backendText,
    formatBackendText,
    runtimeEnvironment,
    databaseTargetName,
    mongoDatabaseNameOverride,
  }) {
    Object.assign(this, {
      mongoose,
      resolveMongoDatabaseName,
      verifyMongoDatabaseName,
      backendText,
      formatBackendText,
      runtimeEnvironment,
      databaseTargetName,
      mongoDatabaseNameOverride,
    });
  }

  async connectToDatabase(uri, nodeEnv) {
    if (!uri) {
      throw new Error(this.backendText.database.missingMongoUri);
    }

    const targetDatabaseName = this.resolveMongoDatabaseName({
      nodeEnv,
      mongoUri: uri,
      mongoDatabaseNameOverride: this.mongoDatabaseNameOverride,
    });

    await this.mongoose.connect(uri, {
      dbName: this.databaseTargetName,
    });

    const connectedDatabaseName = this.mongoose.connection.db?.databaseName;
    this.verifyMongoDatabaseName(connectedDatabaseName, this.databaseTargetName);

    console.log(
      this.formatBackendText(this.backendText.database.connectedLogTemplate, {
        environment: this.runtimeEnvironment,
        connectedDatabaseName,
        targetDatabaseName,
      }),
    );
  }
}

class BackgroundSyncService {
  constructor({
    syncDriversFromOfficialSource,
    syncCalendarFromOfficialSource,
    backendText,
    formatBackendText,
    appConfig,
  }) {
    Object.assign(this, {
      syncDriversFromOfficialSource,
      syncCalendarFromOfficialSource,
      backendText,
      formatBackendText,
      appConfig,
    });
  }

  async run() {
    console.log(this.backendText.sync.startBackground);

    try {
      const syncedDrivers = await this.syncDriversFromOfficialSource();
      if (syncedDrivers.length === 0) {
        console.warn(this.appConfig.uiText.backend.errors.driversUnavailable);
      } else {
        console.log(this.formatBackendText(this.backendText.sync.driversSynchronizedTemplate, { count: syncedDrivers.length }));
      }
    } catch (error) {
      console.warn(this.backendText.sync.driverSyncWarning, error.message);
    }

    try {
      const syncedCalendar = await this.syncCalendarFromOfficialSource();
      if (syncedCalendar.length === 0) {
        console.warn(this.appConfig.uiText.backend.errors.calendarUnavailable);
      } else {
        console.log(this.formatBackendText(this.backendText.sync.calendarSynchronizedTemplate, { count: syncedCalendar.length }));
      }
    } catch (error) {
      console.warn(this.backendText.sync.calendarSyncWarning, error.message);
    }
  }
}

class ServerBootstrapService {
  constructor({
    databaseConnectionService,
    backgroundSyncService,
    ensureAdminCredentials,
    app,
    host,
    port,
    backendText,
    formatBackendText,
  }) {
    Object.assign(this, {
      databaseConnectionService,
      backgroundSyncService,
      ensureAdminCredentials,
      app,
      host,
      port,
      backendText,
      formatBackendText,
    });
  }

  async start({ mongoUri, nodeEnv }) {
    await this.databaseConnectionService.connectToDatabase(mongoUri, nodeEnv);
    await this.ensureAdminCredentials();

    this.app.listen(this.port, this.host, () => {
      console.log(
        this.formatBackendText(this.backendText.logs.serverStarted, {
          origin: `http://${this.host}:${this.port}`,
        }),
      );

      void this.backgroundSyncService.run();
    });
  }
}

export {
  BackgroundSyncService,
  DatabaseConnectionService,
  ServerBootstrapService,
};
