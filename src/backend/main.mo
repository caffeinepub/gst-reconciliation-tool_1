import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Int "mo:core/Int";

actor {
  type ReconciliationStatus = {
    #matched;
    #missingIn2b;
    #missingInBooks;
  };

  module ReconciliationStatus {
    public func compare(status1 : ReconciliationStatus, status2 : ReconciliationStatus) : Order.Order {
      switch (status1, status2) {
        case (#matched, #matched) { #equal };
        case (#matched, _) { #less };
        case (_, #matched) { #greater };
        case (#missingIn2b, #missingIn2b) { #equal };
        case (#missingIn2b, _) { #less };
        case (_, #missingIn2b) { #greater };
        case (#missingInBooks, #missingInBooks) { #equal };
      };
    };
  };

  type ReconciliationRow = {
    gstin : Text;
    invoiceNo : Text;
    invoiceDate : Text;
    taxableValueBook : Float;
    taxableValue2b : Float;
    igstBook : Float;
    igst2b : Float;
    cgstBook : Float;
    cgst2b : Float;
    sgstBook : Float;
    sgst2b : Float;
    status : ReconciliationStatus;
  };

  module ReconciliationRow {
    public func compare(row1 : ReconciliationRow, row2 : ReconciliationRow) : Order.Order {
      switch (Text.compare(row1.gstin, row2.gstin)) {
        case (#equal) {
          switch (Text.compare(row1.invoiceNo, row2.invoiceNo)) {
            case (#equal) { ReconciliationStatus.compare(row1.status, row2.status) };
            case (order) { order };
          };
        };
        case (order) { order };
      };
    };

    public func compareByStatus(row1 : ReconciliationRow, row2 : ReconciliationRow) : Order.Order {
      ReconciliationStatus.compare(row1.status, row2.status);
    };
  };

  type ReconciliationSummary = {
    totalRecords : Nat;
    matched : Nat;
    missingIn2b : Nat;
    missingInBooks : Nat;
  };

  type ReconciliationSession = {
    id : Text;
    name : Text;
    timestamp : Time.Time;
    summary : ReconciliationSummary;
    results : [ReconciliationRow];
  };

  module ReconciliationSession {
    public func compare(s1 : ReconciliationSession, s2 : ReconciliationSession) : Order.Order {
      Int.compare(s2.timestamp, s1.timestamp);
    };
  };

  type SessionMetadata = {
    id : Text;
    name : Text;
    timestamp : Time.Time;
    summary : ReconciliationSummary;
  };

  module SessionMetadata {
    public func compare(m1 : SessionMetadata, m2 : SessionMetadata) : Order.Order {
      Int.compare(m2.timestamp, m1.timestamp);
    };
  };

  let sessions = Map.empty<Text, ReconciliationSession>();

  public shared ({ caller }) func saveSession(name : Text, summary : ReconciliationSummary, results : [ReconciliationRow]) : async Text {
    let id = name.concat(Time.now().toText());
    let session : ReconciliationSession = {
      id;
      name;
      timestamp = Time.now();
      summary;
      results;
    };
    sessions.add(id, session);
    id;
  };

  public query ({ caller }) func listSessions() : async [SessionMetadata] {
    sessions.values().toArray().map(
      func(session) {
        {
          id = session.id;
          name = session.name;
          timestamp = session.timestamp;
          summary = session.summary;
        };
      }
    ).sort(); // implicitly uses SessionMetadata.compare
  };

  public query ({ caller }) func getSession(id : Text) : async ?ReconciliationSession {
    sessions.get(id);
  };

  public shared ({ caller }) func deleteSession(id : Text) : async () {
    if (not sessions.containsKey(id)) {
      Runtime.trap("Session not found");
    };
    sessions.remove(id);
  };
};
