import { Card, H2, H3, Paragraph, YStack } from "tamagui";

export default function Index() {
  return (
    <YStack padding="$8" gap="$8">
      <H2>体重</H2>
      <YStack gap="$4">
        <Card elevate size="$4" p="$4">
          <H3>今週</H3>
          <Paragraph>70.0 kg</Paragraph>
        </Card>
        <Card elevate size="$4" p="$4">
          <H3>先週</H3>
          <Paragraph>68.3 kg</Paragraph>
        </Card>
        <Card elevate size="$4" p="$4">
          <H3>移動平均 (差分)</H3>
          <Paragraph>+1.3 kg</Paragraph>
        </Card>
      </YStack>
    </YStack>
  );
}
