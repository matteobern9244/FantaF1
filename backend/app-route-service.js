class SaveRequestService {
  constructor({
    requireAdminSession,
    verifyMongoDatabaseName,
    readPersistedParticipantRoster,
    validateParticipants,
    buildParticipantsInvalidResponse,
    readCalendarCache,
    readAppData,
    isRaceLocked,
    buildSaveErrorResponse,
    formatBackendText,
    backendText,
    appConfig,
    validatePredictions,
    buildPredictionsMissingResponse,
    writeAppData,
    classifySaveError,
    extractErrorDetails,
    runtimeEnvironment,
    databaseTargetName,
    participantSlots,
    predictionFieldOrder,
    createRequestId,
  }) {
    Object.assign(this, {
      requireAdminSession,
      verifyMongoDatabaseName,
      readPersistedParticipantRoster,
      validateParticipants,
      buildParticipantsInvalidResponse,
      readCalendarCache,
      readAppData,
      isRaceLocked,
      buildSaveErrorResponse,
      formatBackendText,
      backendText,
      appConfig,
      validatePredictions,
      buildPredictionsMissingResponse,
      writeAppData,
      classifySaveError,
      extractErrorDetails,
      runtimeEnvironment,
      databaseTargetName,
      participantSlots,
      predictionFieldOrder,
      createRequestId,
    });
  }

  async handleSaveRequest(req, res, { requirePredictions = false, routePath }) {
    const requestId = this.createRequestId();

    try {
      if (!this.requireAdminSession(req, res)) {
        return;
      }

      this.verifyMongoDatabaseName(this.getConnectedDatabaseName?.(), this.databaseTargetName);

      const newData = req.body;
      const persistedParticipantRoster = await this.readPersistedParticipantRoster();

      if (!this.validateParticipants(newData?.users, persistedParticipantRoster, this.participantSlots)) {
        const response = this.buildParticipantsInvalidResponse(newData, requestId);
        return res.status(response.status).json(response.payload);
      }

      const calendar = await this.readCalendarCache();
      const selectedRace = calendar.find((race) => race.meetingKey === newData?.selectedMeetingKey);

      if (selectedRace) {
        const currentData = await this.readAppData();
        if (this.isRaceLocked(selectedRace, newData, currentData)) {
          const response = this.buildSaveErrorResponse({
            environment: this.runtimeEnvironment,
            requestId,
            code: 'race_locked',
            error: this.appConfig.uiText.calendar.raceLockedError,
            details: this.formatBackendText(this.backendText.save.raceLockedDetailsTemplate, {
              meetingKey: selectedRace.meetingKey,
              startTime: selectedRace.raceStartTime || selectedRace.endDate || 'unknown',
            }),
          });

          return res.status(response.status).json(response.payload);
        }
      }

      if (
        requirePredictions &&
        !this.validatePredictions(
          newData?.users,
          this.predictionFieldOrder,
          newData?.weekendStateByMeetingKey,
          newData?.selectedMeetingKey,
        )
      ) {
        const response = this.buildPredictionsMissingResponse(requestId);
        return res.status(response.status).json(response.payload);
      }

      await this.writeAppData(newData);
      res.json({ message: this.appConfig.uiText.backend.messages.saveSuccess });
    } catch (error) {
      const code = this.classifySaveError(error);
      const details = this.extractErrorDetails(error);
      const response = this.buildSaveErrorResponse({
        environment: this.runtimeEnvironment,
        requestId,
        code,
        error: this.appConfig.uiText.backend.errors.saveFailed,
        details,
      });

      console.error(
        this.formatBackendText(this.backendText.save.saveRouteFailureTemplate, {
          routePath,
          requestId,
          environment: this.runtimeEnvironment,
          databaseTarget: this.databaseTargetName,
          code,
        }),
        error,
      );

      res.status(response.status).json(response.payload);
    }
  }
}

export { SaveRequestService };
