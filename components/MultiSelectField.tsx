import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SelectOption } from "./SelectField";

interface Props<T> {
  label: string;
  /** Shown above the options in the sheet — e.g. the full question text. */
  question?: string;
  value: T[];
  options: SelectOption<T>[];
  onChange: (value: T[]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

/**
 * Multi-select sibling of SelectField: same field-plus-bottom-sheet pattern,
 * but options toggle and the sheet stays open until the user is done.
 * Selections are kept in the order the options are declared, not tap order.
 */
export default function MultiSelectField<T extends string | number>({
  label,
  question,
  value,
  options,
  onChange,
  placeholder = "Select options",
  required = false,
  disabled = false,
  error,
  hint,
}: Props<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  const toggle = (option: SelectOption<T>) => {
    const next = value.includes(option.value)
      ? value.filter((v) => v !== option.value)
      : // Re-derive from the option list so the order stays stable.
        options
          .filter((o) => o.value === option.value || value.includes(o.value))
          .map((o) => o.value);
    onChange(next);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {label}
        {required ? <Text style={{ color: colors.error }}>*</Text> : null}
      </Text>

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            backgroundColor: colors.input.background,
            borderColor: error ? colors.error : colors.input.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.fieldText,
            {
              color: selectedLabels.length
                ? colors.input.text
                : colors.input.placeholder,
            },
          ]}
          numberOfLines={2}
        >
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={22}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {hint && !error ? (
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>{hint}</Text>
      ) : null}
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {question ?? label}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false}>
              {options.map((option) => {
                const active = value.includes(option.value);
                return (
                  <TouchableOpacity
                    key={String(option.value)}
                    activeOpacity={0.7}
                    onPress={() => toggle(option)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: active
                          ? colors.primary + "12"
                          : "transparent",
                        borderColor: colors.divider,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={active ? "check-box" : "check-box-outline-blank"}
                      size={22}
                      color={active ? colors.primary : colors.textTertiary}
                    />
                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: active ? colors.primary : colors.textPrimary,
                            fontWeight: active ? "700" : "500",
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text
                          style={[
                            styles.optionDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.button.primary }]}
              onPress={() => setOpen(false)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.doneButtonText, { color: colors.button.primaryText }]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  fieldText: { flex: 1, fontSize: 15 },
  errorText: { fontSize: 12, marginTop: 6 },
  hintText: { fontSize: 12, marginTop: 6 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 8,
    gap: 12,
  },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 15 },
  optionDescription: { fontSize: 12, marginTop: 3 },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  doneButtonText: { fontSize: 15, fontWeight: "700" },
});
