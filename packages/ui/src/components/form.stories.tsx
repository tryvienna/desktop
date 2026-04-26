import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';
import { Input } from './input';
import { Textarea } from './textarea';
import { Checkbox } from './checkbox';
import { Button } from './button';

const meta = {
  title: 'Form Controls/Form',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SimpleFormDemo() {
  const form = useForm({
    defaultValues: {
      username: '',
      email: '',
      bio: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="grid gap-6 w-96">
        <FormField
          control={form.control}
          name="username"
          rules={{ required: 'Username is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormDescription>We'll never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself..." {...field} />
              </FormControl>
              <FormDescription>Brief description for your profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export const SimpleForm: Story = {
  render: () => <SimpleFormDemo />,
};

function ValidationDemo() {
  const form = useForm({
    defaultValues: { name: '', email: 'invalid-email' },
  });

  // Trigger validation on mount to show errors
  React.useEffect(() => {
    form.trigger();
  }, []);

  return (
    <Form {...form}>
      <form className="grid gap-6 w-96">
        <FormField
          control={form.control}
          name="name"
          rules={{
            required: 'Name is required',
            minLength: { value: 2, message: 'Min 2 characters' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export const WithValidationErrors: Story = {
  render: () => <ValidationDemo />,
};

function WithCheckboxDemo() {
  const form = useForm({
    defaultValues: { terms: false },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="grid gap-6 w-96">
        <FormField
          control={form.control}
          name="terms"
          rules={{ validate: (v) => v === true || 'You must accept the terms' }}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Accept terms and conditions</FormLabel>
              </div>
              <FormDescription>
                You agree to our Terms of Service and Privacy Policy.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Continue</Button>
      </form>
    </Form>
  );
}

export const WithCheckbox: Story = {
  render: () => <WithCheckboxDemo />,
};
