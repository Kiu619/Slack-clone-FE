import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "@/components/custom-dialog";
import Typography from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const themeSchema = z.object({
  themeString: z.string()
    .min(1, "Theme string is required")
    .refine((val) => {
      const parts = val.split(',').map(p => p.trim());
      if (parts.length < 2) return false;
      return parts.every(p => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(p));
    }, {
      message: "Theme string must contain at least 2 hex colors separated by commas."
    })
});

type ThemeFormValues = z.infer<typeof themeSchema>;

interface ImportThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (colors: {
    systemNav: string;
    selectedItems: string;
  }) => void;
}

export default function ImportThemeDialog({ open, onOpenChange, onImport }: ImportThemeDialogProps) {
  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      themeString: "",
    },
  });

  const onSubmit = (data: ThemeFormValues) => {
    const colors = data.themeString.split(",").map(c => c.trim());
    onImport({
      systemNav: colors[0],
      selectedItems: colors[1],
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <CustomDialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) form.reset();
    }}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Import Theme</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="space-y-4">
        <Typography text="Copy and paste a theme string below to use it." variant="p" className="text-sm text-gray-400" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="import-theme-form">
            <FormField
              control={form.control}
              name="themeString"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="#124426, #350D36"
                      className="bg-white dark:bg-[#1A1D21] border-[#565856] focus:border-selection-hover transition-colors"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CustomDialogBody>
      <CustomDialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
        <Button
          className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white"
          form="import-theme-form"
          type="submit"
          disabled={!form.formState.isDirty}
        >
          Import
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  )
}
