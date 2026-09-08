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

export interface SelectOption<T> {
  value: T;
  label: string;
  /** Optional helper line shown under the label in the option sheet. */
  description?: string;
}

interface Props<T> {
  label: string;
  /** Shown above the options in the sheet — e.g. the full question text. */
  question?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * A themed select: a tappable field showing the current choice, opening a
 * bottom sheet of options. Generic over the value type so it works with the
 * numeric codes the booking API uses (1 | 2 | 3) as well as strings.
 */
export default function SelectField<T extends string | number>({
  label,
  question,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  required = false,
  disabled = false,
  error,
}: Props<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value) ?? null;

  const handleSelect = (option: SelectOption<T>) => {
    onChange(option.value);
    setOpen(false);
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
            { color: selected ? colors.input.text : colors.input.placeholder },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={22}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

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
          {/* Stop taps inside the sheet from closing it. */}
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
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={String(option.value)}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(option)}
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
                    {active ? (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
    maxHeight: "70%",
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
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 15 },
  optionDescription: { fontSize: 12, marginTop: 3 },
});
