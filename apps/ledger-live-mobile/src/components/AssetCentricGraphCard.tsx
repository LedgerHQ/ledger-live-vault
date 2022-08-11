import React, {
  useState,
  useCallback,
  useMemo,
  ReactNode,
  memo,
  useEffect,
} from "react";
import { useTheme } from "styled-components/native";
import { AccountLike } from "@ledgerhq/types-live";
import { Unit, Currency } from "@ledgerhq/types-cryptoassets";
import { getAccountUnit } from "@ledgerhq/live-common/account/index";
import {
  ValueChange,
  PortfolioRange,
  BalanceHistoryWithCountervalue,
} from "@ledgerhq/live-common/portfolio/v2/types";
import {
  Box,
  Flex,
  Text,
  Transitions,
  InfiniteLoader,
  GraphTabs,
} from "@ledgerhq/native-ui";

import { useTranslation } from "react-i18next";
import { getCurrencyColor } from "@ledgerhq/live-common/currencies/index";
import { useTimeRange } from "../actions/settings";
import Delta from "./Delta";
import CurrencyUnitValue from "./CurrencyUnitValue";
import { Item } from "./Graph/types";
import { useBalanceHistoryWithCountervalue } from "../actions/portfolio";
import getWindowDimensions from "../logic/getWindowDimensions";
import Graph from "./Graph";
import Touchable from "./Touchable";
import TransactionsPendingConfirmationWarning from "./TransactionsPendingConfirmationWarning";
import { NoCountervaluePlaceholder } from "./CounterValue";
import DiscreetModeButton from "./DiscreetModeButton";

const { width } = getWindowDimensions();

type FooterProps = {
  renderAccountSummary: () => ReactNode;
};

// const Footer = ({ renderAccountSummary }: FooterProps) => {
//   const accountSummary = renderAccountSummary && renderAccountSummary();
//   return accountSummary ? (
//     <Box
//       flexDirection={"row"}
//       alignItems={"center"}
//       marginTop={5}
//       overflow={"hidden"}
//     >
//       {accountSummary}
//     </Box>
//   ) : null;
// };

type Props = {
  asset: any;
};

const timeRangeMapped: any = {
  all: "all",
  "1y": "year",
  "30d": "month",
  "7d": "week",
  "24h": "day",
};

function AssetCentricGraphCard({ asset }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [timeRange, setTimeRange] = useTimeRange();
  const [loading, setLoading] = useState(false);
  //   const { countervalueChange } = useBalanceHistoryWithCountervalue({
  //     account,
  //     range: timeRange,
  //   });

  const ranges = useMemo(
    () =>
      Object.keys(timeRangeMapped).map(r => ({
        label: t(`common:time.${timeRangeMapped[r]}`),
        value: timeRangeMapped[r],
      })),
    [t],
  );

  const rangesLabels = ranges.map(({ label }) => label);

  const activeRangeIndex = ranges.findIndex(r => r.value === timeRange);

  // const isAvailable = !useCounterValue || countervalueAvailable;

  const updateRange = useCallback(
    index => {
      if (ranges[index]) {
        const range: PortfolioRange = ranges[index].value;
        setLoading(true);
        setTimeRange(range);
      }
    },
    [ranges, setTimeRange],
  );

  //   useEffect(() => {
  //     if (history && history.length > 0) {
  //       setLoading(false);
  //     }
  //   }, [history]);

  const [hoveredItem, setHoverItem] = useState<Item>();

  const mapCryptoValue = useCallback(d => d.value || 0, []);
  const mapCounterValue = useCallback(
    d => (d.countervalue ? d.countervalue : 0),
    [],
  );

  return (
    <Flex flexDirection="column" mt={20}>
      <GraphCardHeader asset={asset} />
      <Flex height={120} alignItems="center" justifyContent="center">
        {!loading ? (
          <Transitions.Fade duration={400} status="entering">
            {/** @ts-expect-error import js issue */}
            {/* <Graph
              isInteractive
              isLoading={!isAvailable}
              height={120}
              width={width}
              color={
                // getCurrencyColor(account?.currency) ||
                colors.primary.c80
              }
              data={[]}
              //   mapValue={useCounterValue ? mapCounterValue : mapCryptoValue}
              onItemHover={setHoverItem}
              verticalRangeRatio={10}
              fill={colors.background.main}
            /> */}
          </Transitions.Fade>
        ) : (
          <InfiniteLoader size={32} />
        )}
      </Flex>
      <Flex pt={16} px={6} bg={colors.background.main}>
        {/* <GraphTabs
          activeIndex={activeRangeIndex}
          onChange={updateRange}
          labels={rangesLabels}
        /> */}
      </Flex>
      {/* <Footer renderAccountSummary={renderAccountSummary} /> */}
    </Flex>
  );
}

type HeaderTitleProps = {
  asset: any;
};

const GraphCardHeader = ({ asset }: HeaderTitleProps) => {
  // const items = [
  //   {
  //     unit: cryptoCurrencyUnit,
  //     value: item.value,
  //   },
  //   {
  //     unit: counterValueUnit,
  //     value: item.countervalue,
  //     joinFragmentsSeparator: " ",
  //   },
  // ];
  const items = [
    {
      unit: "altDol",
      value: 42,
    },
    {
      unit: "dol",
      value: 42,
      joinFragmentsSeparator: " ",
    },
  ];

  const shouldUseCounterValue = false;
  // countervalueAvailable && useCounterValue;
  // if (shouldUseCounterValue) {
  //   items.reverse();
  // }

  return (
    <Flex
      flexDirection={"row"}
      px={6}
      pt={100}
      justifyContent={"space-between"}
    >
      <Touchable
        event="SwitchAccountCurrency"
        //   eventProperties={{ useCounterValue: shouldUseCounterValue }}
        //   onPress={countervalueAvailable ? onSwitchAccountCurrency : undefined}
        style={{ flexShrink: 1 }}
      >
        <Flex>
          <Flex>
            <Flex flexDirection="row">
              <Text
                variant={"large"}
                fontWeight={"medium"}
                color={"neutral.c70"}
              >
                {typeof items[1]?.value === "number" ? (
                  "42424242"
                ) : (
                  // <CurrencyUnitValue {...items[1]} />
                  <NoCountervaluePlaceholder />
                )}
              </Text>
            </Flex>
          </Flex>
          <Text
            fontFamily="Inter"
            fontWeight="semiBold"
            fontSize="32px"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            42424242
            {/* <CurrencyUnitValue
                disableRounding={shouldUseCounterValue}
                {...items[0]}
              /> */}
          </Text>
          <Flex flexDirection="row" alignItems="center">
            {/* <Delta percent valueChange={valueChange} /> */}
            <Flex ml={2}>
              {/* <Delta unit={items[0].unit} valueChange={valueChange} /> */}
            </Flex>
          </Flex>
        </Flex>
      </Touchable>
    </Flex>
  );
};

export default memo(AssetCentricGraphCard);
