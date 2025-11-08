package com.ticketbroker.service;

import com.ticketbroker.model.Settings;
import com.ticketbroker.repository.SettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettingsServiceTest {

    @Mock
    private SettingsRepository settingsRepository;

    @InjectMocks
    private SettingsService settingsService;

    private Settings testSetting;

    @BeforeEach
    void setUp() {
        testSetting = new Settings();
        testSetting.setId(1L);
        testSetting.setKey("test_key");
        testSetting.setValue("test_value");
    }

    @Test
    void getValue_ShouldReturnValue_WhenKeyExists() {
        // Given
        when(settingsRepository.findByKey("test_key")).thenReturn(Optional.of(testSetting));

        // When
        String result = settingsService.getValue("test_key", "default");

        // Then
        assertThat(result).isEqualTo("test_value");
        verify(settingsRepository).findByKey("test_key");
    }

    @Test
    void getValue_ShouldReturnDefault_WhenKeyDoesNotExist() {
        // Given
        when(settingsRepository.findByKey("non_existent")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getValue("non_existent", "default_value");

        // Then
        assertThat(result).isEqualTo("default_value");
        verify(settingsRepository).findByKey("non_existent");
    }

    @Test
    void setValue_ShouldUpdateExistingSetting_WhenKeyExists() {
        // Given
        when(settingsRepository.findByKey("test_key")).thenReturn(Optional.of(testSetting));
        when(settingsRepository.save(any(Settings.class))).thenAnswer(invocation -> {
            Settings setting = invocation.getArgument(0);
            setting.setValue("new_value");
            return setting;
        });

        // When
        Settings result = settingsService.setValue("test_key", "new_value");

        // Then
        assertThat(result.getValue()).isEqualTo("new_value");
        verify(settingsRepository).findByKey("test_key");
        verify(settingsRepository).save(argThat(setting -> 
            setting.getKey().equals("test_key") && 
            setting.getValue().equals("new_value")
        ));
    }

    @Test
    void setValue_ShouldCreateNewSetting_WhenKeyDoesNotExist() {
        // Given
        when(settingsRepository.findByKey("new_key")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenAnswer(invocation -> {
            Settings setting = invocation.getArgument(0);
            setting.setId(2L);
            return setting;
        });

        // When
        Settings result = settingsService.setValue("new_key", "new_value");

        // Then
        assertThat(result.getKey()).isEqualTo("new_key");
        assertThat(result.getValue()).isEqualTo("new_value");
        verify(settingsRepository).findByKey("new_key");
        verify(settingsRepository).save(argThat(setting -> 
            setting.getKey().equals("new_key") && 
            setting.getValue().equals("new_value")
        ));
    }

    @Test
    void getSetting_ShouldReturnSetting_WhenKeyExists() {
        // Given
        when(settingsRepository.findByKey("test_key")).thenReturn(Optional.of(testSetting));

        // When
        Optional<Settings> result = settingsService.getSetting("test_key");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(testSetting);
        verify(settingsRepository).findByKey("test_key");
    }

    @Test
    void getSetting_ShouldReturnEmpty_WhenKeyDoesNotExist() {
        // Given
        when(settingsRepository.findByKey("non_existent")).thenReturn(Optional.empty());

        // When
        Optional<Settings> result = settingsService.getSetting("non_existent");

        // Then
        assertThat(result).isEmpty();
        verify(settingsRepository).findByKey("non_existent");
    }
}

